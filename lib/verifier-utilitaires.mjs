#!/usr/bin/env node
/**
 * Contrôle de la référence des utilitaires (`.agents/reference-utilitaires.md`), sans dépendance : Node seul, toute techno.
 *
 * Tenu par workflow-kit (`lib/verifier-utilitaires.mjs`). Dans un projet, ce fichier est une COPIE que la synchronisation
 * du kit écrase : ne pas le modifier là. Il sert à qui n'a pas le kit (collaborateur, session cloud) :
 *
 *   node .agents/verifier-utilitaires.mjs [chemin/du/reference-utilitaires.md]
 *
 * Sans argument : le `reference-utilitaires.md` voisin du script, sinon `.agents/reference-utilitaires.md` du dossier courant.
 * Le format (`.agents/ecrire-un-utilitaire.md`) ne s'applique qu'à un fichier qui le déclare en tête
 * (ligne `> **Format** : `.agents/ecrire-un-utilitaire.md``) : sans elle, rien n'est contrôlé (fichier à migrer).
 * Six vérifications, décrites dans `.agents/ecrire-un-utilitaire.md` (section « Vérifier »). Code de sortie 1 s'il y a un écart.
 */
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

export const MAX_LINE = 300;
const FORMAT = /^>\s*\*\*Format\*\*\s*:\s*`[^`]*ecrire-un-utilitaire\.md`/m;
const SP_ID_G = /SP-[A-Z0-9]+-\d+/g;
const PLACEHOLDER = /[<>*{}]|\.\.\.|…/;

/** Le fichier déclare-t-il le format ? Ligne `> **Format** :` avant la première section `## `. */
export function formatDeclared(text) {
  return FORMAT.test(text.split(/^## /m)[0]);
}

/** Nom d'une entrée ou d'une classe citée : sans espace de noms ni membre (`A\B\Nom::m()` → `Nom`). */
const baseName = (s) => s.split('::')[0].split('\\').pop().trim();
const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** Nom de méthode d'un jeton `methode(...)` ou `Nom::methode(...)` ; `null` pour un membre sans parenthèses. */
function methodName(token) {
  const m = /^(?:[\w\\]+::)?([A-Za-z_]\w*)\s*\(/.exec(token.trim());
  return m ? m[1] : null;
}

/**
 * La méthode est-elle déclarée dans ce source ? Toute techno : mot-clé de déclaration (`function`, `def`, `fn`…),
 * méthode de classe ou d'objet en début de ligne (modificateurs admis), fonction affectée (`const nom =`), propriété-fonction.
 */
export function declares(src, name) {
  const n = esc(name);
  return (
    new RegExp(`\\b(?:function|def|fn|func|fun|sub)\\s+&?${n}\\s*[(<]`).test(src) ||
    new RegExp(`^[ \\t]*(?:(?:public|private|protected|internal|static|async|abstract|final|override|virtual|readonly|export|default|get|set)\\s+)*${n}\\s*[(<]`, 'm').test(src) ||
    new RegExp(`\\b(?:const|let|var)\\s+${n}\\s*=`).test(src) ||
    new RegExp(`^[ \\t]*${n}\\s*:\\s*(?:async\\s+)?(?:function\\b|\\()`, 'm').test(src)
  );
}

/** Index (lignes du tableau de `## Index`) et entrées (`### `) : domaine, champs, fichiers, méthodes. */
export function parseReference(text) {
  const lines = text.replace(/^﻿/, '').split(/\r?\n/);
  const index = [];
  const entries = [];
  let section = null;
  let entry = null;
  let inMethods = false;
  let inFence = false;
  const addMethod = (token, n) => {
    const name = methodName(token);
    if (name && !PLACEHOLDER.test(token)) entry.methods.push({ name, n });
  };
  lines.forEach((line, i) => {
    if (/^\s*```/.test(line)) {
      inFence = !inFence;
      return;
    }
    if (inFence) return;
    const h = /^(#{1,6})\s+(.*)$/.exec(line);
    if (h) {
      inMethods = false;
      if (h[1].length === 2) {
        section = h[2].trim();
        entry = null;
      } else if (h[1].length === 3) {
        if (section !== null && /^index$/i.test(section)) section = null; // entrée sans titre de domaine sous l'index
        const title = h[2].trim();
        const raw = (/^`([^`]+)`/.exec(title) ?? [])[1] ?? null;
        entry = { title, name: raw && !PLACEHOLDER.test(raw) ? baseName(raw) : null, raw, n: i + 1, domain: section, fields: new Set(), files: [], methods: [] };
        entries.push(entry);
      } else entry = null;
      return;
    }
    if (section !== null && /^index$/i.test(section)) {
      if (/^---+$/.test(line.trim())) {
        section = null; // fin de l'index : le corps suit, même sans titre de domaine
        return;
      }
      const row = /^\|(.*)\|\s*$/.exec(line);
      if (!row) return;
      const first = row[1].split('|')[0].trim();
      if (!first || /^:?-+:?$/.test(first) || /^entr[ée]e$/i.test(first)) return;
      index.push({ title: first, n: i + 1 });
      return;
    }
    if (!entry) return;
    const field = /^[-*]\s+\*\*([^*]+)\*\*\s*:\s*(.*)$/.exec(line);
    if (field) {
      const name = field[1].trim().toLowerCase();
      entry.fields.add(name);
      inMethods = /^m[ée]thodes$/.test(name);
      if (name === 'fichier' || name === 'fichiers') for (const m of field[2].matchAll(/`([^`]+)`/g)) entry.files.push({ p: m[1].trim(), n: i + 1 });
      if (inMethods) {
        const first = /^`([^`]+)`/.exec(field[2].trim());
        if (first) addMethod(first[1], i + 1);
      }
      return;
    }
    if (inMethods) {
      const sub = /^\s+[-*]\s+`([^`]+)`/.exec(line);
      if (sub) addMethod(sub[1], i + 1);
      else if (/^\S/.test(line)) inMethods = false;
    }
  });
  return { lines, index, entries };
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

/** Identifiants `SP-…` qui existent comme entrée (`### SP-…`) dans la spec parallèle ; `null` si la spec est absente. */
function specIds(specText) {
  if (specText === null) return null;
  return new Set([...specText.matchAll(/^###\s+(SP-[A-Z0-9]+-\d+)\b/gm)].map((m) => m[1]));
}

/**
 * Les six vérifications de `.agents/ecrire-un-utilitaire.md`, sur un texte déclaré au format.
 * `files` : chemins relatifs du projet ; `read(f)` : contenu d'un fichier ; `specText` : la spec parallèle, ou `null`.
 */
export function checkReferenceText(text, { files = [], read = () => '', specText = null } = {}) {
  const problems = [];
  const { lines, index, entries } = parseReference(text);
  if (!index.length && !entries.length) return ['aucune entrée trouvée : format non reconnu (attendu : `## Index` et des entrées `### `)'];

  // 1. Index ↔ entrées
  const byTitle = new Map();
  for (const e of entries) {
    if (byTitle.has(e.title)) problems.push(`l.${e.n} : entrée « ${e.title} » en double`);
    byTitle.set(e.title, e);
  }
  const indexed = new Map();
  for (const r of index) {
    if (indexed.has(r.title)) problems.push(`l.${r.n} : « ${r.title} » en double dans l'index`);
    indexed.set(r.title, r);
    if (!byTitle.has(r.title)) problems.push(`l.${r.n} : « ${r.title} » dans l'index sans entrée \`### ${r.title}\``);
  }
  for (const e of entries) if (!indexed.has(e.title)) problems.push(`l.${e.n} : entrée « ${e.title} » absente de l'index`);

  // 2. Titre et champs obligatoires ; 3. fichiers cités ; 4. méthodes déclarées
  const fileSet = new Set(files);
  const lower = new Map(files.map((f) => [f.toLowerCase(), f]));
  const sources = new Map();
  const source = (f) => {
    if (!sources.has(f)) {
      let s = '';
      try {
        s = read(f);
      } catch {}
      sources.set(f, s);
    }
    return sources.get(f);
  };
  const filesOf = new Map();
  for (const e of entries) {
    if (!e.raw) problems.push(`l.${e.n} : entrée « ${e.title} » sans nom entre backticks dans son titre`);
    if (!e.fields.has('fichier') && !e.fields.has('fichiers')) problems.push(`l.${e.n} : entrée « ${e.title} » sans ligne \`**Fichier**\``);
    if (!e.fields.has('rôle') && !e.fields.has('role')) problems.push(`l.${e.n} : entrée « ${e.title} » sans ligne \`**Rôle**\``);
    const found = [];
    for (const { p, n } of e.files) {
      if (PLACEHOLDER.test(p)) continue;
      const rel = p.replace(/\\/g, '/').replace(/^\.\//, '');
      if (rel.endsWith('/')) {
        if (!files.some((f) => f.startsWith(rel))) problems.push(`l.${n} : dossier \`${p}\` introuvable`);
        continue;
      }
      if (fileSet.has(rel)) found.push(rel);
      else if (lower.has(rel.toLowerCase())) problems.push(`l.${n} : \`${p}\` n'existe qu'avec une autre casse (« ${lower.get(rel.toLowerCase())} ») : morte sous Linux`);
      else problems.push(`l.${n} : fichier \`${p}\` introuvable`);
    }
    if (e.name) filesOf.set(e.name, [...(filesOf.get(e.name) ?? []), ...found]);
    if (!found.length) continue;
    for (const { name, n } of e.methods) {
      if (!found.some((f) => declares(source(f), name))) problems.push(`l.${n} : méthode \`${name}\` non déclarée dans ${found.map((f) => `\`${f}\``).join(', ')}`);
    }
  }
  // 4 (suite). `Nom::methode()` cité, dont `Nom` est une entrée : déclaré dans un de ses fichiers
  let inFence = false;
  lines.forEach((line, i) => {
    if (/^\s*```/.test(line)) inFence = !inFence;
    if (inFence || /^#{1,6}\s/.test(line) || /^\|/.test(line)) return;
    for (const m of line.matchAll(/`([^`]+)`/g)) {
      const ref = /^([\w\\]+)::([A-Za-z_]\w*)\s*\(/.exec(m[1].trim());
      if (!ref) continue;
      const own = filesOf.get(baseName(ref[1]));
      if (!own?.length) continue;
      if (!own.some((f) => declares(source(f), ref[2]))) problems.push(`l.${i + 1} : \`${baseName(ref[1])}::${ref[2]}()\` non déclarée dans ${own.map((f) => `\`${f}\``).join(', ')}`);
    }
  });

  // 5. Règles citées
  const ids = specIds(specText);
  if (ids) {
    lines.forEach((line, i) => {
      for (const id of new Set(line.match(SP_ID_G) ?? [])) if (!ids.has(id)) problems.push(`l.${i + 1} : ${id} cité, absent de la spec parallèle`);
    });
  }

  // 6. Style : ce que la référence ne porte pas
  inFence = false;
  lines.forEach((line, i) => {
    if (/^\s*```/.test(line)) inFence = !inFence;
    if (inFence) return;
    if (/\bl\.\s?\d+/.test(line) || /\.[A-Za-z]{1,6}:\d+/.test(line)) problems.push(`l.${i + 1} : numéro de ligne (le nom de la méthode suffit)`);
    if (/\b\d{4}-\d{2}-\d{2}\b/.test(line)) problems.push(`l.${i + 1} : date (l'historique vit dans git et le fichier de feature)`);
    if (/accord utilisateur/i.test(line)) problems.push(`l.${i + 1} : « accord utilisateur » (l'historique vit dans git et le fichier de feature)`);
    const len = [...line].length;
    if (len > MAX_LINE) problems.push(`l.${i + 1} : ${len} caractères (${MAX_LINE} au plus)`);
  });
  return problems;
}

/** Racine du projet d'une référence : `<racine>/.agents/reference-utilitaires.md`, sinon le dossier courant. */
function rootOf(file) {
  const abs = path.resolve(file);
  const parts = abs.split(path.sep);
  return parts.at(-2) === '.agents' ? parts.slice(0, -2).join(path.sep) || path.sep : process.cwd();
}

/**
 * Contrôle du fichier : `null` s'il est absent ; `{ declared: false, problems: [] }` s'il ne déclare pas le format ;
 * sinon `{ declared: true, problems }`. `root` (défaut : déduit du chemin) sert à résoudre fichiers et spec parallèle.
 */
export function checkUtilitairesFile(file, { root = rootOf(file) } = {}) {
  if (!fs.existsSync(file)) return null;
  const text = fs.readFileSync(file, 'utf8');
  if (!formatDeclared(text)) return { declared: false, problems: [] };
  const spec = path.join(root, '.agents', 'specs', 'spec-parallele.md');
  const specText = fs.existsSync(spec) ? fs.readFileSync(spec, 'utf8') : null;
  return { declared: true, problems: checkReferenceText(text, { files: projectFiles(root), read: (f) => fs.readFileSync(path.join(root, f), 'utf8'), specText }) };
}

function main(argv) {
  const here = path.dirname(fileURLToPath(import.meta.url));
  const sibling = path.join(here, 'reference-utilitaires.md');
  const file = argv[0] ?? (fs.existsSync(sibling) ? sibling : path.join(process.cwd(), '.agents/reference-utilitaires.md'));
  const r = checkUtilitairesFile(file);
  const label = path.relative(process.cwd(), file) || file;
  if (r === null) {
    console.error(`[--] ${label} absent`);
    return 1;
  }
  if (!r.declared) {
    console.log(`[--] ${label} : format non déclaré (\`> **Format** : \`.agents/ecrire-un-utilitaire.md\`\`), contrôle non appliqué`);
    return 0;
  }
  if (!r.problems.length) {
    console.log(`[ok] ${label} (format et méthodes citées)`);
    return 0;
  }
  console.log(`[KO] ${label} (format et méthodes citées) : ${r.problems.length} écart(s)`);
  for (const p of r.problems) console.log(`  ${p}`);
  return 1;
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) process.exitCode = main(process.argv.slice(2));
