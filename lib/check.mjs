import path from 'node:path';
import { checkRefs, checkSpecFile, HISTORIC, projectRoot, SPEC_PARALLELE } from './check-meta.mjs';
import { exists, readUtf8 } from './util.mjs';

const OPEN_TAG = /^\s*[-*]\s+(?:\*\*)?`?\[(À CONSIGNER|À VALIDER|AMENDE SP-[^\]]+)\]/u;
/** Tranché = flèche suivie de ✅ ou ⛔ (`→ ✅ SP-VL-78`, `→ ⛔ hors périmètre`). Un ✅ isolé dans la ligne ne suffit pas. */
const DECIDED = /→\s*`?[✅⛔]/u;
const SP_ID = /SP-[A-Z0-9]+-\d+/;

const GWT_LINE = /^\s*(?:>\s*)?(?:[-*]\s+)?(?:\*\*|__)?(GIVEN|WHEN|THEN|AND|BUT)\b/;

/**
 * Format des scénarios (jalon 1→2) : sous `## Scénarios baseline…` / `## Scénarios évolution…`, chaque `### Scénario …`
 * a exactement un WHEN et au moins un THEN (lignes de code comprises : un GWT peut être écrit dans un bloc).
 * Un scénario sans aucun GIVEN/WHEN/THEN (titre seul : retiré, reclassé, renvoi) n'est pas contrôlé.
 * Edge cases : un `✅ couvert` cite un scénario, un `❌ non couvert` porte sa justification.
 */
export function scenarioProblems(text) {
  const problems = [];
  let h2 = '';
  let scenario = null;
  const flush = () => {
    if (!scenario) return;
    const { n, title, when, then, any } = scenario;
    if (any) {
      if (when !== 1) problems.push(`l.${n} : « ${title} » a ${when} WHEN (exactement 1 attendu)`);
      if (!then) problems.push(`l.${n} : « ${title} » n'a aucun THEN`);
    }
    scenario = null;
  };
  text.split(/\r?\n/).forEach((line, i) => {
    if (line.startsWith('## ')) {
      flush();
      h2 = line.slice(3).trim();
      return;
    }
    const h = /^(#{3,4})\s+(.*\S)/.exec(line);
    if (h) {
      flush();
      if (/^Sc[ée]narios\b/i.test(h2) && /^Sc[ée]nario\b/i.test(h[2])) scenario = { n: i + 1, title: h[2].slice(0, 70), when: 0, then: 0, any: false };
      return;
    }
    if (!scenario) return;
    const k = GWT_LINE.exec(line)?.[1];
    if (!k) return;
    scenario.any = true;
    if (k === 'WHEN') scenario.when++;
    if (k === 'THEN') scenario.then++;
  });
  flush();

  let inEdge = false;
  text.split(/\r?\n/).forEach((line, i) => {
    if (line.startsWith('## ')) inEdge = /^## Edge cases identifiés/.test(line);
    if (!inEdge || !/^\s*\|/.test(line)) return;
    const cells = line.split('|').slice(1, -1).map((c) => c.trim());
    if (!/^EC-\d+/.test(cells[0] ?? '')) return;
    const gwt = cells[2] ?? '';
    const status = cells[cells.length - 1] ?? '';
    if (/✅/.test(status) && (!gwt || /^[—–-]$/.test(gwt))) problems.push(`l.${i + 1} : ${cells[0]} « couvert » sans scénario associé`);
    if (/❌/.test(status) && status.replace(/[❌*`]/g, '').replace(/non\s+couvert/i, '').replace(/[\s().:—–-]/g, '').length < 3) {
      problems.push(`l.${i + 1} : ${cells[0]} « non couvert » sans justification`);
    }
  });
  return problems;
}

/** Lignes du fichier avec leur section (## / ###), hors blocs de code. */
function linesWithSections(text) {
  const out = [];
  let h2 = '';
  let h3 = '';
  let fence = false;
  text.split(/\r?\n/).forEach((line, i) => {
    if (/^\s*```/.test(line)) {
      fence = !fence;
      return;
    }
    if (fence) return;
    if (line.startsWith('## ')) {
      h2 = line.slice(3).trim();
      h3 = '';
    } else if (line.startsWith('### ')) {
      h3 = line.slice(4).trim();
    }
    out.push({ n: i + 1, line, h2, h3 });
  });
  return out;
}

const cellsOf = (line) => line.split('|').slice(1, -1).map((c) => c.trim());
const isTableRow = (line) => /^\s*\|/.test(line) && !/^\s*\|[\s|:-]+\|\s*$/.test(line);

/**
 * Corps brut des sections (blocs de code compris), par titre : `## X` → clé `X`, `### Y` sous `## X` → clé `X > Y`.
 * Chaque entrée garde le numéro de ligne de son titre.
 */
function sectionBodies(text) {
  const map = new Map();
  let h2 = '';
  let current = null;
  let fence = false;
  text.split(/\r?\n/).forEach((line, i) => {
    if (/^\s*```/.test(line)) fence = !fence;
    if (!fence && line.startsWith('## ')) {
      h2 = line.slice(3).trim();
      current = { n: i + 1, lines: [] };
      map.set(h2, current);
      return;
    }
    if (!fence && line.startsWith('### ')) {
      current = { n: i + 1, lines: [] };
      map.set(`${h2} > ${line.slice(4).trim()}`, current);
      return;
    }
    current?.lines.push(line);
  });
  return map;
}

/**
 * Section remplie : au moins un contenu hors consigne (`> …`) — texte, puce avec une valeur (pas un libellé `**X** :` seul),
 * ligne de tableau hors en-tête avec une cellule non vide, ou bloc de code non vide. `Aucun` compte comme rempli.
 */
function isFilled(body) {
  let fence = false;
  let header = true;
  for (const line of body) {
    if (/^\s*```/.test(line)) {
      fence = !fence;
      continue;
    }
    if (fence) {
      if (line.trim()) return true;
      continue;
    }
    const t = line.trim();
    if (!t || t.startsWith('>') || t === '---') continue;
    if (/^\|/.test(t)) {
      if (!isTableRow(t)) continue;
      if (header) {
        header = false;
        continue;
      }
      if (cellsOf(t).some(Boolean)) return true;
      continue;
    }
    const item = t.replace(/^[-*]\s*/, '').replace(/^\*\*[^*]+\*\*\s*:?\s*/, '');
    if (item) return true;
  }
  return false;
}

/** Lignes de données d'un tableau de section (hors en-tête et ligne vide du gabarit), avec leur numéro de ligne. */
function tableRows(entry) {
  const rows = [];
  let header = true;
  entry.lines.forEach((line, k) => {
    if (!isTableRow(line)) return;
    if (header) {
      header = false;
      return;
    }
    const cells = cellsOf(line);
    if (cells.some(Boolean)) rows.push({ n: entry.n + 1 + k, cells });
  });
  return rows;
}

/**
 * Statut d'une ligne de Progression.
 * fait : ✅…, OK…, sauté…, ⏭️… — à faire : vide, ⬜ — à refaire : 🔁 — en cours : 🔄 — sinon : inconnu (signalé).
 */
function statusKind(cell) {
  const s = (cell ?? '').trim();
  if (!s || s.startsWith('⬜')) return 'todo';
  if (s.startsWith('🔁')) return 'redo';
  if (s.startsWith('🔄')) return 'doing';
  if (/^(✅|⏭️|ok\b|sauté)/iu.test(s)) return 'done';
  return 'unknown';
}

/**
 * Contrôle d'un fichier de feature. Renvoie `{ problems, delivery }` (problems vide = OK).
 * Structure (toujours) : statuts reconnus, Progression cohérente, backtrack tracé au Registre.
 * Étape 1 en cours ou faite : format des scénarios et des edge cases, aucune question ouverte ; faite (jalon 1→2) : aucune ambiguïté ouverte,
 * Contexte technique et Arbitrages du challenge remplis, chaque écart arbitré (Definition of Ready).
 * Étape 3 faite : arbre de flux et fichiers du plan remplis ; étape 4 faite : écarts au plan déclarés ; étape 5 faite : décisions techniques remplies.
 * Ces sections ne sont contrôlées que si le fichier les porte (gabarit à deux phases).
 * Livraison (étape 6 faite, ou fichier DONE-*) : aucune trace meta non tranchée, `SP-*` annoncés présents.
 * Un fichier sans `## Progression` (compacté, ancien format) n'est pas contrôlé.
 */
export function checkFeature(text, { name = '', specText = null } = {}) {
  const lines = linesWithSections(text);
  const problems = [];
  const at = (l, msg) => problems.push(`l.${l.n} : ${msg}`);

  const steps = new Map();
  for (const l of lines) {
    if (l.h2 !== 'Progression' || !isTableRow(l.line)) continue;
    const cells = cellsOf(l.line);
    if (!/^[0-7]$/.test(cells[0])) continue;
    steps.set(Number(cells[0]), { l, cell: cells[3], kind: statusKind(cells[3]) });
  }
  if (!steps.size) return { problems, delivery: false };

  const order = [...steps.keys()].sort((a, b) => a - b);
  const pendingKinds = ['todo', 'redo', 'doing'];
  for (const i of order) {
    const s = steps.get(i);
    if (s.kind === 'unknown') at(s.l, `Progression : statut non reconnu pour l'étape ${i} (« ${s.cell} ») — attendu ✅ / OK / sauté / ⏭️ / ⬜ / 🔄 / 🔁`);
  }
  for (const j of order) {
    if (steps.get(j).kind !== 'done') continue;
    const pending = order.find((i) => i < j && pendingKinds.includes(steps.get(i).kind));
    if (pending !== undefined) at(steps.get(j).l, `Progression : étape ${j} faite alors que l'étape ${pending} est « ${steps.get(pending).cell || 'vide'} »`);
  }

  const registre = lines.filter((l) => l.h2.startsWith('Registre des décisions') && isTableRow(l.line) && cellsOf(l.line)[0] && cellsOf(l.line)[0] !== 'ID');
  const redo = order.filter((i) => steps.get(i).kind === 'redo');
  if (redo.length && !registre.length) at(steps.get(redo[0]).l, 'backtrack en cours (🔁) sans aucune ligne au Registre des décisions');

  const delivery = steps.get(6)?.kind === 'done' || /^DONE-/.test(name);
  // Fin de l'étape 1 (en cours, avant la pause 1) : les GWT présentés à l'utilisateur sont bien formés, les questions de l'étape 0 tranchées.
  // Jalon 1→2 (étape 1 faite) : en plus, les ambiguïtés — tranchées à la pause 1, donc ouvertes avant.
  const step1 = steps.get(1)?.kind;
  const openBox = (l, section) => l.h2.startsWith(section) && !l.line.trimStart().startsWith('>') && /^\s*[-*]\s+\[ \]\s*\S/.test(l.line);
  if (step1 === 'doing' || step1 === 'done' || delivery) {
    problems.push(...scenarioProblems(text));
    for (const l of lines) if (openBox(l, 'Questions specs')) at(l, `case non cochée dans « ${l.h2} »`);
  }
  if (step1 === 'done' || delivery) {
    for (const l of lines) if (openBox(l, 'Ambiguïtés à valider')) at(l, `case non cochée dans « ${l.h2} »`);
  }

  // Sections du gabarit à deux phases : contrôlées seulement si le fichier les porte (un fichier antérieur n'en a pas).
  const bodies = sectionBodies(text);
  const find = (re) => [...bodies.entries()].find(([k]) => re.test(k));
  const done = (i) => steps.get(i)?.kind === 'done' || delivery;
  const mustBeFilled = (re, label) => {
    const hit = find(re);
    if (hit && !isFilled(hit[1].lines)) problems.push(`l.${hit[1].n} : « ${label} » vide (remplir, ou porter \`Aucun\`)`);
    return hit;
  };
  // Jalon 1→2 (Definition of Ready) : faits du code reportés, challenge passé et chaque écart arbitré.
  if (done(1)) {
    mustBeFilled(/^Contexte technique\b/, 'Contexte technique');
    const arbitrages = mustBeFilled(/^Arbitrages du challenge\b/, 'Arbitrages du challenge');
    if (arbitrages) {
      for (const r of tableRows(arbitrages[1])) if (r.cells[2] && !r.cells[3]) problems.push(`l.${r.n} : écart du challenge non arbitré (${r.cells[0] || r.cells[1] || 'sans identifiant'})`);
    }
  }
  // Pause 3 (plan validé) : le plan dit ce qui va être fait ; jalon 4→5 : les écarts au plan sont déclarés.
  const PLAN = /^Plan\b(?! de)/;
  if (find(PLAN)) {
    const plan = find(PLAN)[0];
    const sub = (name) => new RegExp(`^${plan.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')} > ${name}`);
    if (done(3)) {
      mustBeFilled(sub('Arbre de flux'), 'Arbre de flux');
      mustBeFilled(sub('Fichiers à créer'), 'Fichiers à créer / modifier');
    }
    if (done(4)) mustBeFilled(sub('Écarts au plan'), 'Écarts au plan');
  }
  // Pause 5 : récapitulatif technique rempli, une décision proposée par ligne.
  if (done(5)) {
    // pas de \b après « qualité » : sans le drapeau u, « é » n'est pas un caractère de mot
    const decisions = mustBeFilled(/^Revue qualité.* > Décisions techniques/, 'Décisions techniques');
    if (decisions) {
      for (const r of tableRows(decisions[1])) if (r.cells[1] && !r.cells[2]) problems.push(`l.${r.n} : décision technique sans décision proposée (${r.cells[1]})`);
    }
  }

  if (!delivery) return { problems, delivery };

  for (const i of order) {
    if (i <= 6 && pendingKinds.includes(steps.get(i).kind)) at(steps.get(i).l, `livraison : étape ${i} non faite (« ${steps.get(i).cell || 'vide'} »)`);
  }

  for (const l of lines) {
    if (l.line.trimStart().startsWith('>')) continue;
    const tag = l.line.match(OPEN_TAG);
    if (tag && !DECIDED.test(l.line)) at(l, `[${tag[1]}] non tranché (ajouter → ✅ … ou → ⛔ …)`);
    if (l.h3.startsWith('Nouveaux utilitaires à référencer')) {
      const item = l.line.match(/^\s*[-*]\s+(.*\S)/);
      if (item && !/^aucun/i.test(item[1]) && !DECIDED.test(l.line)) at(l, 'utilitaire à référencer non tranché (ajouter → ✅ référencé ou → ⛔ …)');
    }
    if (l.h2.startsWith('Conventions (fichiers-rôles)') && isTableRow(l.line)) {
      const cells = cellsOf(l.line);
      const status = cells[cells.length - 1] ?? '';
      if (cells[0] && cells[0] !== 'Fichier-rôle' && !/^[✅⛔]/u.test(status)) at(l, `fichier meta non mis à jour : ${cells[0]} (statut « ${status || 'vide'} », attendu ✅ ou ⛔)`);
    }
  }

  const nuances = lines.filter((l) => l.h2.startsWith('Nuances consignées') && isTableRow(l.line));
  for (const l of nuances) {
    const id = cellsOf(l.line)[0]?.match(SP_ID)?.[0];
    if (!id) continue;
    if (specText === null) {
      at(l, `${id} : ${SPEC_PARALLELE} introuvable, présence non vérifiable`);
      continue;
    }
    if (!new RegExp(`^###\\s+${id}\\b`, 'm').test(specText)) at(l, `${id} absent des entrées de ${SPEC_PARALLELE}`);
    if (!new RegExp(`^\\|\\s*\`?${id}\`?\\s*\\|`, 'm').test(specText)) at(l, `${id} absent de l'index de ${SPEC_PARALLELE}`);
  }

  return { problems, delivery };
}

function printReport(label, problems) {
  if (!problems.length) {
    console.log(`[ok] ${label}`);
    return 0;
  }
  console.error(`[KO] ${label}`);
  for (const p of problems) console.error(`  - ${p}`);
  return 1;
}

/** Intégrité du spec parallèle + références mortes des fichiers meta, pour le projet de `root`. Code 1 si un écart. */
export function checkMeta(root, { spec = true, refs = true } = {}) {
  let failed = 0;
  if (spec) {
    const sp = checkSpecFile(path.join(root, SPEC_PARALLELE));
    failed += sp === null ? (console.log(`[--] ${SPEC_PARALLELE} absent`), 0) : printReport(`${SPEC_PARALLELE} (intégrité)`, sp);
  }
  if (refs) for (const r of checkRefs(root)) failed += printReport(`${r.file} (références)`, r.problems);
  if (failed) console.error(`\nÉcarts dans les fichiers meta : corriger le fichier (référence morte, index ↔ entrée), ou marquer une mention volontaire d'un fichier disparu par ${HISTORIC}.`);
  return failed ? 1 : 0;
}

/**
 * `check <fichiers>` : contrôle d'un fichier de feature, lancé par le Build (jalon 1→2, jalon 6→7, avant commit, après backtrack).
 * À la livraison, contrôle aussi les fichiers meta du projet (intégrité du spec parallèle, références mortes). Code 1 si un écart.
 */
export function checkFiles(files) {
  let failed = 0;
  const metaRoots = new Set();
  for (const file of files) {
    const root = projectRoot(path.dirname(file));
    const specText = root && exists(path.join(root, SPEC_PARALLELE)) ? readUtf8(path.join(root, SPEC_PARALLELE)) : null;
    const { problems, delivery } = checkFeature(readUtf8(file), { name: path.basename(file), specText });
    failed += printReport(file, problems);
    if (delivery && root) metaRoots.add(root);
  }
  if (failed) console.error("\nTraces non tranchées : les présenter à l'utilisateur, inscrire ses décisions au Registre, marquer → ✅ / → ⛔, écrire les fichiers meta, puis relancer.");
  for (const root of metaRoots) failed += checkMeta(root);
  return failed ? 1 : 0;
}
