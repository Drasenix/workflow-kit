#!/usr/bin/env node
/**
 * Intégrité du spec parallèle (`.agents/specs/spec-parallele.md`), sans dépendance : Node seul.
 *
 * Tenu par workflow-kit (`lib/verifier-spec.mjs`). Dans un projet, ce fichier est une COPIE que la synchronisation
 * du kit écrase : ne pas le modifier là. Il sert à qui n'a pas le kit (collaborateur, session cloud) :
 *
 *   node .agents/specs/verifier-spec.mjs [chemin/du/spec-parallele.md]
 *
 * Sans argument : le `spec-parallele.md` voisin du script, sinon `.agents/specs/spec-parallele.md` du dossier courant.
 * Code de sortie 1 s'il y a un écart.
 */
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
 * Les 5 vérifications de la section « Contrôle d'intégrité » du spec parallèle :
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

export function checkSpecFile(file) {
  return fs.existsSync(file) ? checkSpecText(fs.readFileSync(file, 'utf8')) : null;
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
    console.log(`[ok] ${label} (intégrité)`);
    return 0;
  }
  console.log(`[KO] ${label} (intégrité) : ${problems.length} écart(s)`);
  for (const p of problems) console.log(`  ${p}`);
  return 1;
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) process.exitCode = main(process.argv.slice(2));
