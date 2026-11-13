import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { SPEC_PARALLELE } from './check-meta.mjs';
import { exists, readUtf8 } from './util.mjs';

/**
 * Dérive de la spec : commits d'AUTRES auteurs qui ont pu changer un comportement décrit par une règle sans la mettre à jour.
 * Deux sources, depuis « votre dernier passage » :
 * a. règles : un test cité dans « Gardé par » (convention `tests`) modifié après la dernière mise à jour de la règle
 *    ET après votre dernier commit sur ce test ;
 * b. fichiers : un fichier modifié après votre dernier commit dessus (jamais modifié par vous : non examiné).
 * Informatif : liste des commits à relire, regroupés ; ne juge pas. Les branches non fusionnées ne sont pas vues.
 */

const git = (root, args) => execFileSync('git', ['-C', root, ...args], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'], maxBuffer: 256 * 1024 * 1024 });
const ZERO = /^0{40}$/;

export const parseList = (v) =>
  (Array.isArray(v) ? v : [v])
    .filter(Boolean)
    .flatMap((s) => s.split(/[\s,]+/))
    .filter(Boolean);

/** Entrées du spec : id, lignes [start, end], caduc, ligne « Gardé par ». */
function specEntries(text) {
  const out = [];
  let cur = null;
  text.split(/\r?\n/).forEach((line, i) => {
    const head = /^###\s+(SP-[A-Z0-9]+-\d+)\b/.exec(line);
    if (head) {
      cur = { id: head[1], start: i + 1, end: i + 1, caduc: false, garde: '' };
      out.push(cur);
      return;
    }
    if (/^#{1,3}\s/.test(line)) {
      cur = null;
      return;
    }
    if (!cur) return;
    cur.end = i + 1;
    const st = /^>\s*\*\*Statut\*\*\s*:\s*([^·]*)/.exec(line);
    if (st && /caduc/i.test(st[1])) cur.caduc = true;
    const g = /^>\s*\*\*Gardé par\*\*\s*:\s*(.*)$/.exec(line);
    if (g) cur.garde = g[1];
  });
  return out;
}

/** Convention de « Gardé par » : déclarée dans « Statuts & types », sinon déduite des entrées (tests `::` ou fichiers `DONE-`). */
export function gardeConvention(text) {
  const declared = /\*\*Gardé par\*\*\s*\(convention du projet\)\s*:\s*`(\w+)`/.exec(text);
  if (declared) return declared[1];
  const lines = [...text.matchAll(/^>\s*\*\*Gardé par\*\*\s*:\s*(.*)$/gm)].map((m) => m[1]);
  return lines.filter((l) => l.includes('DONE-')).length > lines.filter((l) => l.includes('::')).length ? 'feature' : 'tests';
}

const selected = (id, regles) =>
  regles.some((r) => {
    const p = r.startsWith('SP-') ? r : `SP-${r}`;
    return id === p || id.startsWith(`${p}-`);
  });

/**
 * @returns {{ convention, commits: Array<{hash, email, name, date, subject, tests: Map<string, Set<string>>, files: Set<string>}>,
 *             sansTest: string[], regles: number, nonExamines: string[] } | { error: string }}
 */
export function derive({ root, regles = [], fichiers = [], auteurs = [] }) {
  try {
    git(root, ['rev-parse', 'HEAD']);
  } catch {
    return { error: 'git indisponible, hors dépôt ou dépôt sans commit' };
  }
  const me = (auteurs.length ? auteurs : [git(root, ['config', 'user.email']).trim()]).map((e) => e.toLowerCase()).filter(Boolean);
  const authorArgs = me.map((e) => `--author=<${e.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}>`);
  const lastMine = new Map();
  const mine = (file) => {
    if (!lastMine.has(file)) lastMine.set(file, me.length ? git(root, ['log', '-1', '--format=%H', ...authorArgs, '--', file]).trim() : '');
    return lastMine.get(file);
  };
  const commits = new Map();
  const logCache = new Map();
  const others = (file, refs) => {
    const key = `${file}\0${refs.join(' ')}`;
    if (!logCache.has(key)) {
      const out = git(root, ['log', '--no-merges', '--format=%H%x09%ae%x09%an%x09%ad%x09%s', '--date=short', 'HEAD', ...(refs.length ? ['--not', ...refs] : []), '--', file]);
      logCache.set(
        key,
        out
          .split('\n')
          .filter(Boolean)
          .map((l) => l.split('\t'))
          .filter(([, email]) => !me.includes(email.toLowerCase())),
      );
    }
    return logCache.get(key);
  };
  const commitOf = ([hash, email, name, date, subject]) => {
    if (!commits.has(hash)) commits.set(hash, { hash, email, name, date, subject, tests: new Map(), files: new Set() });
    return commits.get(hash);
  };

  // a. Règles : tests garants modifiés depuis la règle et depuis votre dernier commit sur le test
  const specFile = path.join(root, SPEC_PARALLELE);
  const specText = exists(specFile) ? readUtf8(specFile) : '';
  const convention = specText ? gardeConvention(specText) : 'tests';
  const sansTest = [];
  let nRegles = 0;
  if (regles.length && specText && convention === 'tests') {
    const entries = specEntries(specText).filter((e) => !e.caduc && selected(e.id, regles));
    nRegles = entries.length;
    const lineCommit = [];
    for (const l of git(root, ['blame', '--porcelain', '--', SPEC_PARALLELE]).split('\n')) {
      const h = /^([0-9a-f]{40}) \d+ (\d+)/.exec(l);
      if (h) lineCommit[Number(h[2])] = h[1];
    }
    const files = git(root, ['ls-files']).split('\n').filter(Boolean);
    const byBase = new Map();
    for (const f of files) {
      const base = path.posix.basename(f).replace(/\.[^.]+$/, '');
      if (!byBase.has(base)) byBase.set(base, []);
      byBase.get(base).push(f);
    }
    const fileSet = new Set(files);
    for (const e of entries) {
      const guards = new Set();
      for (const m of e.garde.matchAll(/`([^`]+)`/g)) {
        const base = m[1].split('::')[0].trim();
        if (base.includes('/')) {
          if (fileSet.has(base)) guards.add(base);
        } else for (const f of byBase.get(base) ?? []) if (/test/i.test(f)) guards.add(f);
      }
      if (!guards.size) {
        sansTest.push(e.id);
        continue;
      }
      // Commits qui ont écrit les lignes de la règle : seuls comptent les commits postérieurs à TOUS (ascendance git, pas l'horloge)
      const ruleCommits = new Set();
      for (let n = e.start; n <= e.end; n++) if (lineCommit[n]) ruleCommits.add(lineCommit[n]);
      if ([...ruleCommits].some((h) => ZERO.test(h))) continue; // règle modifiée dans l'arbre de travail : à jour par définition
      for (const f of guards) {
        for (const c of others(f, [...[...ruleCommits].sort(), mine(f)].filter(Boolean))) {
          const t = commitOf(c).tests;
          if (!t.has(f)) t.set(f, new Set());
          t.get(f).add(e.id);
        }
      }
    }
  }

  // b. Fichiers : modifiés par d'autres depuis votre dernier commit dessus
  const nonExamines = [];
  for (const f of fichiers) {
    const ref = mine(f);
    if (!ref) {
      nonExamines.push(f);
      continue;
    }
    for (const c of others(f, [ref])) commitOf(c).files.add(f);
  }

  return {
    convention,
    commits: [...commits.values()].sort((x, y) => x.date.localeCompare(y.date) || x.hash.localeCompare(y.hash)),
    sansTest,
    regles: nRegles,
    nonExamines,
  };
}

export function printDerive(r, { regles, fichiers }) {
  if (r.error) {
    console.log(`[--] dérive : ${r.error} — contrôle non joué`);
    return 0;
  }
  const portee = [regles.length ? `règles ${regles.join(', ')} : ${r.regles} en vigueur` : '', fichiers.length ? `fichiers : ${fichiers.length}` : ''].filter(Boolean).join(' ; ');
  if (regles.length && r.convention !== 'tests') console.log(`[--] règles : convention « ${r.convention} » (« Gardé par » ne cite pas de tests) — partie règles sans objet`);
  if (!r.commits.length) console.log(`[ok] dérive (${portee}) : aucun commit d'un autre auteur à relire depuis votre dernier passage`);
  else {
    console.log(`[à relire] dérive (${portee}) : ${r.commits.length} commit(s) d'autres auteurs`);
    for (const c of r.commits) {
      console.log(`- ${c.hash.slice(0, 8)} ${c.date} ${c.name} <${c.email}> — ${c.subject}`);
      if (c.tests.size) console.log(`    tests garants modifiés : ${[...c.tests].map(([f, ids]) => `${path.posix.basename(f)} (${[...ids].join(', ')})`).join(' ; ')}`);
      if (c.files.size) console.log(`    fichiers : ${[...c.files].join(', ')}`);
      console.log(`    voir : git show ${c.hash.slice(0, 8)} -- ${[...c.tests.keys(), ...c.files].join(' ')}`);
    }
    console.log('Relire chaque commit (message, puis diff) : un commit qui change un comportement que la règle décrit encore autrement = question bloquante, avec le commit pour source.');
  }
  if (r.sansTest.length) console.log(`[--] ${r.sansTest.length} règle(s) sans test garant résolu, invisibles à ce contrôle : ${r.sansTest.join(', ')}`);
  if (r.nonExamines.length) console.log(`[--] jamais modifiés par vous, non examinés : ${r.nonExamines.join(', ')}`);
  return 0;
}
