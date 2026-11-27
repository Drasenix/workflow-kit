import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { premiereRef } from './check-meta.mjs';
import { exists, readUtf8 } from './util.mjs';

/**
 * Pilotage par les tolérances des tests d'architecture (`…/tolerances/<regle>.json`, fichier => occurrences) :
 * - au plan (étape 3), la ligne « Tolérances » dit quels fichiers que la feature va modifier sont tolérés, et pour quelles
 *   règles : le plan décide alors d'extraire d'abord ou de ne rien ajouter, au lieu de le découvrir au test rouge ;
 * - en revue (étape 5), le bilan dit ce que la feature a fait de la dette, par règle, depuis son point de départ.
 */
const TOLERANCE = /(^|\/)tolerances\/([^/]+)\.json$/;
const git = (root, args) => execFileSync('git', ['-C', root, ...args], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'], maxBuffer: 256 * 1024 * 1024 });
const regle = (f) => TOLERANCE.exec(f)[2];
const somme = (valeurs) => Object.values(valeurs).reduce((total, n) => total + (Number(n) || 0), 0);

function lire(texte) {
  try {
    const valeurs = JSON.parse(texte);
    return valeurs && typeof valeurs === 'object' ? valeurs : {};
  } catch {
    return {};
  }
}

/** Fichiers de tolérances présents dans le projet (suivis ou non, hors ignorés), triés. */
function fichiersDeTolerances(root) {
  try {
    return git(root, ['ls-files', '-co', '--exclude-standard'])
      .split('\n')
      .filter((f) => TOLERANCE.test(f) && exists(path.join(root, f)))
      .sort();
  } catch {
    return [];
  }
}

/** Nombre de lignes d'un fichier, compté comme `file()` de PHP (une fin de ligne finale n'ouvre pas de ligne). */
function lignes(abs) {
  const texte = readUtf8(abs);
  return texte === '' ? 0 : texte.split('\n').length - (texte.endsWith('\n') ? 1 : 0);
}

/**
 * Ligne « Tolérances » du plan : pour chaque fichier cité (chemin relatif au dossier courant ou absolu) toléré par au moins
 * une règle, ses règles et leur compte, et son nombre de lignes. `Tolérances : Aucune` si aucun ne l'est.
 */
export function ligneTolerancesPlan(root, fichiers) {
  const tolerances = fichiersDeTolerances(root).map((f) => ({ regle: regle(f), valeurs: lire(readUtf8(path.join(root, f))) }));
  const items = [];
  for (const brut of fichiers) {
    const rel = path.relative(root, path.resolve(brut)).split(path.sep).join('/');
    const regles = tolerances.filter((t) => Number(t.valeurs[rel]) > 0).map((t) => `${t.regle} ${t.valeurs[rel]}`);
    if (!regles.length) continue;
    const abs = path.join(root, rel);
    items.push(`\`${rel}\`${exists(abs) ? ` (${lignes(abs)} lignes)` : ''} : ${regles.join(', ')}`);
  }
  return `Tolérances : ${items.length ? items.join(' ; ') : 'Aucune'}`;
}

/**
 * Bilan des tolérances depuis le point de départ de la branche (`merge-base` avec la base : `master`, sinon `main`, ou
 * `base` explicite) : variation du total de chaque règle, règle nouvelle avec sa photo. Compte l'état du disque (une
 * tolérance baissée non commitée compte).
 */
export function ligneBilanTolerances(root, base = null) {
  base ||= premiereRef(root, ['master', 'main']);
  if (!base) throw new Error('aucune branche de base (master, main) : préciser --base <branche>');
  const depart = git(root, ['merge-base', 'HEAD', base]).trim();
  const court = git(root, ['rev-parse', '--short', depart]).trim();
  const actuels = new Map(fichiersDeTolerances(root).map((f) => [f, somme(lire(readUtf8(path.join(root, f))))]));
  const avant = git(root, ['ls-tree', '-r', '--name-only', depart]).split('\n').filter((f) => TOLERANCE.test(f));
  const items = [];
  for (const f of [...new Set([...avant, ...actuels.keys()])].sort()) {
    const n = actuels.get(f) ?? 0;
    if (!avant.includes(f)) {
      items.push(`${regle(f)} nouvelle (${n})`);
      continue;
    }
    const ecart = n - somme(lire(git(root, ['show', `${depart}:${f}`])));
    if (ecart !== 0) items.push(`${regle(f)} ${ecart > 0 ? '+' : ''}${ecart}`);
  }
  return `Tolérances (depuis \`${court}\`, base \`${base}\`) : ${items.length ? items.join(' ; ') : 'inchangées'}`;
}

const PLAN = /^\s*Tolérances\s*:/;
const BILAN = /^\s*(?:[-*]\s+)?Tolérances\s*\(/;

/** Ligne « Tolérances » du plan : absente (fichier antérieur au gabarit) → rien ; présente → remplie, au format de la commande. */
export function tolerancesPlanProblems(section) {
  const idx = section.lines.findIndex((l) => PLAN.test(l));
  if (idx < 0) return [];
  const ligne = section.lines[idx];
  const ok = !/[<>]/.test(ligne) && /^\s*Tolérances\s*:\s*(?:Aucune\.?|`[^`]+`.*)\s*$/.test(ligne);
  return ok ? [] : [`l.${section.n + idx + 1} : ligne « Tolérances » non remplie ou hors format (\`workflow-kit tolerances <fichiers modifiés>\`)`];
}

/** Ligne de bilan de la revue : absente (fichier antérieur au gabarit) → rien ; présente → remplie, au format de la commande. */
export function tolerancesBilanProblems(section) {
  const idx = section.lines.findIndex((l) => BILAN.test(l));
  if (idx < 0) return [];
  const ligne = section.lines[idx];
  const ok = !/[<>]/.test(ligne) && /Tolérances\s*\(depuis\s*`[0-9a-f]{7,40}`,\s*base\s*`[^`]+`\)\s*:\s*\S/.test(ligne);
  return ok ? [] : [`l.${section.n + idx + 1} : bilan « Tolérances » non rempli ou hors format (\`workflow-kit tolerances --bilan\`)`];
}

/** Ligne de bilan d'un texte de feature, sous sa forme du DONE (`- **Tolérances** (depuis …) : …`) ; `null` si absente ou non remplie. */
export function ligneTolerancesDuDone(lignesRevue) {
  const ligne = lignesRevue.find((l) => BILAN.test(l));
  if (!ligne || /[<>]/.test(ligne)) return null;
  const m = /Tolérances\s*(\(depuis\s*`[0-9a-f]{7,40}`,\s*base\s*`[^`]+`\)\s*:\s*\S.*?)\s*$/.exec(ligne);
  return m ? `- **Tolérances** ${m[1]}` : null;
}
