#!/usr/bin/env node
/**
 * Contrôle de la spec parallèle (`.agents/specs/spec-parallele.md`), sans dépendance : Node seul, toute techno.
 *
 * Tenu par workflow-kit (`lib/verifier-spec.mjs`). Dans un projet, ce fichier est une COPIE que la synchronisation
 * du kit écrase : ne pas le modifier là. Il sert à qui n'a pas le kit (collaborateur, session cloud) :
 *
 *   node .agents/specs/verifier-spec.mjs [chemin/du/spec-parallele.md]
 *
 * Sans argument : le `spec-parallele.md` voisin du script, sinon `.agents/specs/spec-parallele.md` du dossier courant.
 * Six vérifications : les cinq d'intégrité du texte (`checkSpecText`) et les références « Gardé par » (`checkGardes`).
 * Code de sortie 1 s'il y a un écart.
 */
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const SP_ID_G = /SP-[A-Z0-9]+-\d+/g;
const DATE_G = /\d{4}-\d{2}-\d{2}/g;
// Renvois en retour : « Amendé par », « Amendée par », « Précisé(e) par », « Remplacé(e) par »
const BACK_FIELD = /^(amendée?|précisée?|remplacée?) par$/;

/** Statut normalisé : état (en vigueur / caduc), dates, cibles de caducité. Indépendant des emojis et de la formulation. */
function normStatus(text) {
  const t = text.toLowerCase();
  const state = /caduc/.test(t) ? 'caduc' : /vigueur/.test(t) ? 'en vigueur' : '';
  const targets = state === 'caduc' ? [...new Set(text.match(SP_ID_G) ?? [])].sort().join(', ') : '';
  return { state, dates: [...new Set(text.match(DATE_G) ?? [])].sort().join(', '), targets };
}

/** Champs d'une ligne d'en-tête d'entrée : `> **Champ** : valeur · **Autre** : valeur`. */
function fields(line) {
  return line
    .replace(/^>\s*/, '')
    .split(/\s·\s(?=\*\*)/)
    .map((seg) => /^\*\*([^*]+)\*\*\s*:(.*)$/.exec(seg.trim()))
    .filter(Boolean)
    .map((m) => ({ name: m[1].trim().toLowerCase(), value: m[2] }));
}

/**
 * Les 5 vérifications décrites dans `.agents/specs/ecrire-une-regle.md` (section « Vérifier ») :
 * 1. index ↔ entrées (mêmes IDs, sans doublon) ; 2. statut de l'index = statut de l'entrée ;
 * 3. toute référence `SP-…` (supersessions comprises) vise une entrée existante ; 4. chaque entrée porte ses `Mots-clés` ;
 * 5. renvois réciproques : une règle en vigueur citée dans la ligne `Amende` d'une autre porte `Amendé par` en retour.
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
      current = { id: head[1], n: i + 1, status: null, keywords: false, amende: [], back: new Set() };
      entries.set(head[1], current);
      return;
    }
    if (/^#{1,3}\s/.test(line)) current = null;
    if (!current || !/^>/.test(line)) return;
    const st = /^>\s*\*\*Statut\*\*\s*:\s*([^·]*)/.exec(line);
    if (st) current.status = st[1];
    if (/^>\s*\*\*Mots-clés\*\*\s*:\s*\S/.test(line)) current.keywords = true;
    for (const f of fields(line)) {
      const ids = f.value.match(SP_ID_G) ?? [];
      if (f.name === 'amende') for (const id of ids) current.amende.push({ id, n: i + 1 });
      if (BACK_FIELD.test(f.name)) for (const id of ids) current.back.add(id);
    }
  });

  if (!index.size && !entries.size) return ['aucune entrée SP-* trouvée : format non reconnu (attendu : index `| SP-… |` et entrées `### SP-…`)'];

  for (const [id, r] of index) if (!entries.has(id)) problems.push(`l.${r.n} : ${id} dans l'index sans entrée \`### ${id}\``);
  for (const [id, e] of entries) {
    e.caduc = e.status !== null && normStatus(e.status).state === 'caduc';
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

  // 5. Renvois réciproques. Un amendeur devenu caduc est relayé par ses successeurs (chaîne des `caduc (→ …)`).
  const chain = (id) => {
    const out = [];
    for (let cur = id; cur && !out.includes(cur); ) {
      out.push(cur);
      const e = entries.get(cur);
      cur = e?.caduc ? normStatus(e.status).targets.split(', ')[0] : null;
    }
    return out;
  };
  for (const [id, e] of entries) {
    for (const { id: target, n } of e.amende) {
      const t = entries.get(target);
      if (!t || t.caduc || target === id) continue;
      const relais = chain(id);
      if (relais.includes(target) || relais.some((r) => t.back.has(r))) continue;
      const via = relais.length > 1 ? ` (caduc → ${relais.slice(1).join(' → ')})` : '';
      problems.push(`l.${t.n} : ${target} amendée par ${id}${via} (l.${n}) sans « Amendé par : ${relais.at(-1)} » en retour`);
    }
  }
  return problems;
}

/** Convention de « Gardé par » : déclarée en tête de la spec, sinon déduite des entrées (tests `::` ou fichiers `DONE-`). */
export function gardeConvention(text) {
  const declared = /\*\*Gardé par\*\*\s*\(convention du projet\)\s*:\s*`(\w+)`/.exec(text);
  if (declared) return declared[1];
  const lines = [...text.matchAll(/^>\s*\*\*Gardé par\*\*\s*:\s*(.*)$/gm)].map((m) => m[1]);
  return lines.filter((l) => l.includes('DONE-')).length > lines.filter((l) => l.includes('::')).length ? 'feature' : 'tests';
}

const SKIP = new Set(['.git', 'node_modules', 'vendor']);
/** Fichiers du projet (suivis ou nouveaux, hors ignorés) ; sans git, parcours du dossier. Chemins relatifs, séparateur `/`. */
export function projectFiles(root) {
  try {
    const out = execFileSync('git', ['-C', root, 'ls-files', '-co', '--exclude-standard'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'], maxBuffer: 256 * 1024 * 1024 });
    return out.split('\n').filter(Boolean);
  } catch {
    const files = [];
    const walk = (dir) => {
      let entries = [];
      try {
        entries = fs.readdirSync(dir, { withFileTypes: true });
      } catch {
        return;
      }
      for (const e of entries) {
        if (SKIP.has(e.name)) continue;
        const p = path.join(dir, e.name);
        if (e.isDirectory()) walk(p);
        else files.push(path.relative(root, p).split(path.sep).join('/'));
      }
    };
    walk(root);
    return files;
  }
}

const isTestFile = (f) => /(^|\/)(tests?|__tests__|spec)\//i.test(f) || /[._-](test|spec)\.[a-z]+$/i.test(f) || /Test\.[a-z]+$/.test(f);
const stem = (f) => path.posix.basename(f).replace(/\.[^.]+$/, '').replace(/\.(test|spec)$/i, '');

/**
 * 6. Références « Gardé par » des entrées en vigueur, toute techno :
 * - convention `tests` : `Classe::test` ou `chemin/du/fichier.ext::nom` → le fichier de test existe et le test y figure
 *   (`function nom(`, `def nom(`, `it('nom'`, `test('nom'`, `describe('nom'`, ou `'#nom'`) ; `Classe::prefixe…` → un test commence par
 *   le préfixe ; `…fragment` ou `e3b…` (sans `::`) → un test de la dernière classe citée contient le fragment ;
 *   `ClasseTest` ou `chemin/du/fichier.ext` seuls → le fichier existe. Une parenthèse qui cite un test supprimé est ignorée.
 * - convention `feature` : chaque fichier `DONE-….md` cité existe.
 * `files` : chemins relatifs du projet ; `read(f)` : contenu d'un fichier.
 */
export function checkGardes(text, files, read) {
  const problems = [];
  const convention = gardeConvention(text);
  const tests = files.filter(isTestFile);
  const byStem = new Map();
  for (const f of tests) {
    if (!byStem.has(stem(f))) byStem.set(stem(f), []);
    byStem.get(stem(f)).push(f);
  }
  const fileSet = new Set(files);
  const baseSet = new Set(files.map((f) => path.posix.basename(f)));
  const namesCache = new Map();
  const names = (list) => {
    const out = new Set();
    for (const f of list) {
      if (!namesCache.has(f)) {
        const s = new Set();
        let src = '';
        try {
          src = read(f);
        } catch {}
        for (const m of src.matchAll(/\b(?:function|def)\s+(\w+)\s*\(/g)) s.add(m[1]);
        // `describe('#parseToken')`, `describe('.save()')` : le nom cité est celui de la fonction testée
        for (const m of src.matchAll(/\b(?:it|test|describe|context)(?:\.\w+)?\s*\(\s*(['"`])((?:(?!\1).)+)\1/g)) s.add(m[2]).add(m[2].replace(/^[#.]/, '').replace(/\(\)$/, ''));
        namesCache.set(f, s);
      }
      for (const n of namesCache.get(f)) out.add(n);
    }
    return out;
  };
  const lines = text.split(/\r?\n/);
  let id = null;
  let caduc = false;
  lines.forEach((line, i) => {
    const head = /^###\s+(SP-[A-Z0-9]+-\d+)\b/.exec(line);
    if (head) {
      id = head[1];
      caduc = false;
      return;
    }
    if (/^#{1,3}\s/.test(line)) id = null;
    if (!id) return;
    const st = /^>\s*\*\*Statut\*\*\s*:\s*([^·]*)/.exec(line);
    if (st && /caduc/i.test(st[1])) caduc = true;
    const g = /^>\s*\*\*Gardé par\*\*\s*:\s*(.*)$/.exec(line);
    if (!g || caduc) return;
    const at = (tok, why) => problems.push(`l.${i + 1} : ${id} « Gardé par » \`${tok}\` — ${why}`);
    const toks = [...g[1].replace(/\([^()]*supprim[^()]*\)/g, '').matchAll(/`([^`]+)`/g)].map((m) => m[1].trim().replace(/\(\)$/, ''));
    if (convention === 'feature') {
      for (const tok of toks) if (/^DONE-[^\s/]*\.md$/.test(tok) && !baseSet.has(tok)) at(tok, 'fichier de feature introuvable');
      return;
    }
    let last = null;
    for (const tok of toks) {
      if (tok.includes('::')) {
        const [rawCls, member] = tok.split(/::(.*)/s);
        const cls = rawCls.split('\\').pop().trim();
        const list = cls.includes('/') ? (fileSet.has(cls) ? [cls] : []) : byStem.get(cls) ?? [];
        if (!list.length) {
          at(tok, cls.includes('/') ? 'fichier introuvable' : 'pas une classe de test du dossier des tests');
          last = null;
          continue;
        }
        last = list;
        const known = names(list);
        const ok = member.includes('…') ? [...known].some((n) => n.startsWith(member.split('…')[0])) : known.has(member);
        if (!ok) at(tok, `test introuvable dans ${path.posix.basename(list[0])}`);
      } else if (/^[A-Z]\w*Test$/.test(tok)) {
        last = byStem.get(tok) ?? null;
        if (!last) at(tok, 'classe de test introuvable');
      } else if (/\/[^/]+\.[A-Za-z0-9]+$/.test(tok) && !/[<>*{}]/.test(tok)) {
        if (!fileSet.has(tok)) at(tok, 'fichier introuvable');
        else last = [tok];
      } else if (tok.includes('…') && last) {
        const fragment = tok.split('…').reduce((a, b) => (b.length > a.length ? b : a), '').replace(/^[_ ]+|[_ ]+$/g, '');
        if (fragment && ![...names(last)].some((n) => n.includes(fragment))) at(tok, `aucun test de ${path.posix.basename(last[0])} ne contient « ${fragment} »`);
      }
    }
  });
  return problems;
}

/** Racine du projet d'un spec : `<racine>/.agents/specs/spec-parallele.md`, sinon le dossier courant. */
function rootOf(file) {
  const abs = path.resolve(file);
  const parts = abs.split(path.sep);
  return parts.slice(-3, -1).join('/') === '.agents/specs' ? parts.slice(0, -3).join(path.sep) || path.sep : process.cwd();
}

/** Les six vérifications ; `root` (défaut : déduit du chemin du spec) sert à résoudre les références « Gardé par ». */
export function checkSpecFile(file, { root = rootOf(file) } = {}) {
  if (!fs.existsSync(file)) return null;
  const text = fs.readFileSync(file, 'utf8');
  return [...checkSpecText(text), ...checkGardes(text, projectFiles(root), (f) => fs.readFileSync(path.join(root, f), 'utf8'))];
}

function main(argv) {
  const here = path.dirname(fileURLToPath(import.meta.url));
  const sibling = path.join(here, 'spec-parallele.md');
  const file = argv[0] ?? (fs.existsSync(sibling) ? sibling : path.join(process.cwd(), '.agents/specs/spec-parallele.md'));
  const problems = checkSpecFile(file);
  const label = path.relative(process.cwd(), file) || file;
  if (problems === null) {
    console.error(`[--] ${label} absent`);
    return 1;
  }
  if (!problems.length) {
    console.log(`[ok] ${label} (intégrité et tests cités)`);
    return 0;
  }
  console.log(`[KO] ${label} (intégrité et tests cités) : ${problems.length} écart(s)`);
  for (const p of problems) console.log(`  ${p}`);
  return 1;
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) process.exitCode = main(process.argv.slice(2));
