import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { exists, readUtf8, walk } from './util.mjs';

export const SPEC_PARALLELE = '.agents/specs/spec-parallele.md';
const SP_ID_G = /SP-[A-Z0-9]+-\d+/g;
const DATE_G = /\d{4}-\d{2}-\d{2}/g;

/** Racine du projet : premier dossier parent qui contient `.agents/`. */
export function projectRoot(from = process.cwd()) {
  for (let d = path.resolve(from); ; d = path.dirname(d)) {
    if (exists(path.join(d, '.agents'))) return d;
    if (path.dirname(d) === d) return null;
  }
}

/** Statut normalisé : état (en vigueur / caduc), dates, cibles de caducité. Indépendant des emojis et de la formulation. */
function normStatus(text) {
  const t = text.toLowerCase();
  const state = /caduc/.test(t) ? 'caduc' : /vigueur/.test(t) ? 'en vigueur' : '';
  const targets = state === 'caduc' ? [...new Set(text.match(SP_ID_G) ?? [])].sort().join(', ') : '';
  return { state, dates: [...new Set(text.match(DATE_G) ?? [])].sort().join(', '), targets };
}

/**
 * Intégrité du spec parallèle (les 4 vérifications de sa section « Contrôle d'intégrité ») :
 * 1. index ↔ entrées (mêmes IDs, sans doublon) ; 2. statut de l'index = statut de l'entrée ;
 * 3. toute référence `SP-…` (supersessions comprises) vise une entrée existante ; 4. chaque entrée porte ses `Mots-clés`.
 */
export function checkSpecText(text) {
  const problems = [];
  const lines = text.split(/\r?\n/);
  const index = new Map();
  const entries = new Map();
  let current = null;

  lines.forEach((line, i) => {
    const row = /^\|\s*`?(SP-[A-Z0-9]+-\d+)`?\s*\|([^|]*)\|/.exec(line);
    if (row) {
      if (index.has(row[1])) problems.push(`l.${i + 1} : ${row[1]} en double dans l'index`);
      index.set(row[1], { n: i + 1, status: row[2] });
      return;
    }
    const head = /^###\s+(SP-[A-Z0-9]+-\d+)\b/.exec(line);
    if (head) {
      if (entries.has(head[1])) problems.push(`l.${i + 1} : entrée ${head[1]} en double`);
      current = { id: head[1], n: i + 1, status: null, keywords: false };
      entries.set(head[1], current);
      return;
    }
    if (/^#{1,3}\s/.test(line)) current = null;
    if (!current) return;
    const st = /^>\s*\*\*Statut\*\*\s*:\s*([^·]*)/.exec(line);
    if (st) current.status = st[1];
    if (/^>\s*\*\*Mots-clés\*\*\s*:\s*\S/.test(line)) current.keywords = true;
  });

  if (!index.size && !entries.size) return ['aucune entrée SP-* trouvée : format non reconnu (attendu : index `| SP-… |` et entrées `### SP-…`)'];

  for (const [id, r] of index) if (!entries.has(id)) problems.push(`l.${r.n} : ${id} dans l'index sans entrée \`### ${id}\``);
  for (const [id, e] of entries) {
    if (!index.has(id)) {
      problems.push(`l.${e.n} : entrée ${id} absente de l'index`);
      continue;
    }
    if (e.status === null) {
      problems.push(`l.${e.n} : entrée ${id} sans ligne \`> **Statut** :\``);
    } else {
      const a = normStatus(index.get(id).status);
      const b = normStatus(e.status);
      if (!a.state || !b.state) problems.push(`l.${e.n} : ${id} statut non reconnu (attendu « en vigueur » ou « caduc »)`);
      else if (a.state !== b.state) problems.push(`l.${e.n} : ${id} statut « ${b.state} » dans l'entrée, « ${a.state} » dans l'index`);
      else if (a.targets !== b.targets) problems.push(`l.${e.n} : ${id} caduc vers ${b.targets || '?'} dans l'entrée, ${a.targets || '?'} dans l'index`);
      else if (a.dates && b.dates && a.dates !== b.dates) problems.push(`l.${e.n} : ${id} date ${b.dates} dans l'entrée, ${a.dates} dans l'index`);
    }
    if (!e.keywords) problems.push(`l.${e.n} : entrée ${id} sans ligne \`> **Mots-clés** :\``);
  }

  lines.forEach((line, i) => {
    // lignes d'index : déjà rapprochées des entrées (vérification 1)
    if (/^\|\s*`?SP-/.test(line)) return;
    for (const id of new Set(line.match(SP_ID_G) ?? [])) {
      if (!entries.has(id)) problems.push(`l.${i + 1} : référence à ${id}, qui n'existe pas comme entrée`);
    }
  });
  return problems;
}

const SKIP_DIRS = new Set(['.git', 'node_modules', 'vendor']);

/**
 * Index des fichiers du projet (chemins relatifs en `/`), casse d'origine conservée.
 * Sert à résoudre un chemin cité depuis n'importe quel dossier conventionnel (fin de chemin), et à vérifier la casse :
 * Windows l'ignore, Linux non — une référence juste sur un poste Windows peut être morte sur un serveur Linux.
 */
function fileIndex(root) {
  const files = walk(root, (name) => SKIP_DIRS.has(name)).map((f) => path.relative(root, f).split(path.sep).join('/'));
  const lower = new Map();
  for (const f of files) {
    const k = f.toLowerCase();
    if (!lower.has(k)) lower.set(k, f);
  }
  return { files, exact: new Set(files), lower };
}

/**
 * Un fichier de feature est cité sous son nom de travail (`x.md`) puis renommé à sa clôture (`DONE-x.md`…) :
 * les deux formes désignent le même fichier.
 */
function closedVariants(p) {
  const dir = path.posix.dirname(p);
  const base = path.posix.basename(p);
  if (/^(DONE|ABANDON|IRREPRODUCTIBLE)-/.test(base) || !base.endsWith('.md')) return [p];
  return [p, ...['DONE', 'ABANDON', 'IRREPRODUCTIBLE'].map((pre) => `${dir}/${pre}-${base}`)];
}

/** Résout `p` : exact (racine ou bases), puis fin de chemin d'un fichier du projet. `wrongCase` = trouvé seulement en ignorant la casse. */
function resolveRef(idx, p, bases) {
  for (const v of closedVariants(p)) {
    for (const b of bases) if (idx.exact.has(b ? `${b}/${v}` : v)) return { ok: true };
    if (idx.files.some((f) => f.endsWith(`/${v}`))) return { ok: true };
  }
  const lp = p.toLowerCase();
  for (const b of bases) {
    const hit = idx.lower.get((b ? `${b}/${p}` : p).toLowerCase());
    if (hit) return { ok: false, wrongCase: hit };
  }
  const hit = idx.files.find((f) => f.toLowerCase().endsWith(`/${lp}`));
  return hit ? { ok: false, wrongCase: hit } : { ok: false };
}

/** Chemins ignorés par git (fichiers générés à l'exécution : journaux, base locale…). Sans git : aucun. */
function gitIgnored(root, paths) {
  if (!paths.length) return new Set();
  try {
    const out = execFileSync('git', ['check-ignore', '--stdin'], { cwd: root, input: paths.join('\n'), encoding: 'utf8', stdio: ['pipe', 'pipe', 'ignore'] });
    return new Set(out.split(/\r?\n/).filter(Boolean));
  } catch (e) {
    // code 1 = aucun chemin ignoré ; autre erreur (pas de dépôt, pas de git) = rien d'ignoré
    return new Set((e.stdout ?? '').toString().split(/\r?\n/).filter(Boolean));
  }
}

const PATH_TOKEN = /`([^`\s]+)`/g;
/** Mention volontaire d'un fichier disparu (liste de fichiers supprimés…) : sur une ligne, ou sur un titre pour toute sa section. */
export const HISTORIC = '<!-- refs:historique -->';

/** Chemin de fichier plausible dans un texte : contient `/`, finit par une extension ; ni gabarit ni joker ni URL. */
function pathCandidate(token) {
  let p = token.replace(/\\/g, '/').replace(/::.*$/, '').replace(/#.*$/, '').replace(/:\d+(-\d+)?$/, '').replace(/\(.*$/, '');
  if (!p.includes('/') || /[<>*{}$|"]|^\w+:\/\/|^[\/~]/.test(p) || /\.\.\.|…/.test(p)) return null;
  return /\/[^/]*\.[A-Za-z0-9]{1,8}$/.test(p) ? p : null;
}

/** Fichiers meta contrôlés : `.agents/*.md` (fichiers-rôles, référentiel, glossaire) et le spec parallèle. Jamais les fichiers de feature. */
export function metaFiles(root) {
  const agents = path.join(root, '.agents');
  const top = exists(agents) ? fs.readdirSync(agents).filter((n) => n.endsWith('.md')).map((n) => path.join(agents, n)) : [];
  const spec = path.join(root, SPEC_PARALLELE);
  return [...top, ...(exists(spec) ? [spec] : [])];
}

/**
 * Références mortes : chaque chemin de fichier cité entre backticks dans les fichiers meta existe, casse comprise.
 * Résolution : racine, `.agents/`, dossier du fichier, `workflow-kit/`, `workflow-kit/core/`, puis fin de chemin
 * de n'importe quel fichier du projet (vues, features citées depuis leur dossier…). Un chemin ignoré par git n'est pas signalé.
 */
export function checkRefs(root) {
  const idx = fileIndex(root);
  const found = [];
  for (const file of metaFiles(root)) {
    const rel = path.relative(root, file).split(path.sep).join('/');
    const bases = [...new Set(['', '.agents', path.posix.dirname(rel), 'workflow-kit', 'workflow-kit/core'])];
    let historicLevel = 0;
    readUtf8(file)
      .split(/\r?\n/)
      .forEach((line, i) => {
        const heading = /^(#{1,6})\s/.exec(line);
        if (heading) historicLevel = line.includes(HISTORIC) ? heading[1].length : historicLevel && heading[1].length > historicLevel ? historicLevel : 0;
        if (historicLevel || line.includes(HISTORIC)) return;
        for (const m of line.matchAll(PATH_TOKEN)) {
          const p = pathCandidate(m[1]);
          if (!p) continue;
          const r = resolveRef(idx, p, bases);
          if (!r.ok) found.push({ rel, n: i + 1, p, wrongCase: r.wrongCase });
        }
      });
  }
  const ignored = gitIgnored(root, [...new Set(found.filter((f) => !f.wrongCase).map((f) => f.p))]);
  const out = new Map(metaFiles(root).map((f) => [path.relative(root, f).split(path.sep).join('/'), []]));
  for (const f of found) {
    if (!f.wrongCase && ignored.has(f.p)) continue;
    out.get(f.rel).push(`l.${f.n} : \`${f.p}\` ${f.wrongCase ? `n'existe qu'avec une autre casse (« ${f.wrongCase} ») : morte sous Linux` : 'introuvable'}`);
  }
  return [...out].map(([file, problems]) => ({ file, problems }));
}

export function checkSpecFile(file) {
  return exists(file) ? checkSpecText(readUtf8(file)) : null;
}
