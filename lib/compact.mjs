import { execFileSync } from 'node:child_process';
import os from 'node:os';
import path from 'node:path';
import { readUtf8, rel, walk, writeUtf8 } from './util.mjs';

/**
 * Compaction d'un fichier de feature clos (skill `compacter-feature`), partie mécanique :
 * - `compactFeature` : squelette depuis la version committée ; les sections conservées sont recopiées
 *   à l'octet près, les sections à rédiger portent le marqueur MARK ;
 * - `checkCompaction` : marqueurs résolus, en-tête et sections conservées identiques à la version de travail,
 *   renvois externes présents.
 */

export const MARK = '[À COMPLÉTER]';

const PREFIXES = ['DONE', 'ABANDON', 'IRREPRODUCTIBLE'];
const CLOSING = /^> (Clôturé|Abandonné).*version de travail : `git show ([0-9a-f]{4,40}):/;
const COVERED = /⏭️|d[ée]j[àa] couverts?/i;
const ID = /(?<![\w-])(?:Q-[A-Z]?\d+[a-z]?|QS-\d+|Q\d+|A\d+|EC-\d+|ADR-\d+|[BE]\d+|R-\d+|P-\d+|D-\d+|C\d+)(?![\w-])/g;

const plain = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
const normTitle = (t) => plain(t).replace(/\s*\([^)]*\)\s*$/, '').replace(/^\d+\.\s*/, '').trim();

// Sort d'une section de niveau 2, sur le titre normalisé (sans accents ni suffixe « (étape n) »)
const SECTION_RULES = [
  [/^resume metier/, 'keep'],
  [/^scenarios?\b/, 'scenarios'],
  [/^decisions? & justifications|^adr\b/, 'adr'],
  [/^recette manuelle/, 'keep'],
  [/^(raison de l'abandon|ce qui a ete tente|questions restees ouvertes|symptome|hypotheses|donnees et journaux|conditions de reouverture)/, 'keep'],
  [/^(progression|specs consultees|questions specs|edge cases|ambiguites|conventions|architecture|revue qualite|nuances consignees|decisions utilisateur)/, 'drop'],
];
const ruleFor = (title) => (SECTION_RULES.find(([re]) => re.test(normTitle(title))) ?? [null, 'unknown'])[1];
const isTree = (title) => /^arbre\b/.test(normTitle(title));

const git = (cwd, args) => execFileSync('git', args, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });

/**
 * Titres hors blocs de code, avec la fin de leur bloc (titre suivant de niveau <=).
 * `boldTrees` : arbres écrits en paragraphe gras (« **Arbre d'exécution** ») suivis d'un bloc de code.
 */
function parse(text) {
  const lines = text.replace(/\r\n/g, '\n').split('\n');
  const heads = [];
  const boldTrees = [];
  let fence = false;
  lines.forEach((l, i) => {
    if (/^\s*(```|~~~)/.test(l)) fence = !fence;
    else if (!fence) {
      const m = /^(#{1,6})\s+(.*\S)\s*$/.exec(l);
      if (m) heads.push({ i, level: m[1].length, title: m[2] });
      const b = /^\*\*(Arbre\b[^*]*)\*\*\s*$/i.exec(l);
      if (b) boldTrees.push({ i, title: b[1].trim() });
    }
  });
  heads.forEach((h, k) => {
    const next = heads.slice(k + 1).find((n) => n.level <= h.level);
    h.end = next ? next.i : lines.length;
  });
  for (const t of boldTrees) {
    // fin = fermeture du premier bloc de code qui suit (sinon : titre suivant)
    const open = lines.findIndex((l, j) => j > t.i && /^\s*(```|~~~)/.test(l));
    const close = open < 0 ? -1 : lines.findIndex((l, j) => j > open && /^\s*(```|~~~)/.test(l));
    const nextHead = heads.find((h) => h.i > t.i)?.i ?? lines.length;
    t.end = close >= 0 && close < nextHead ? close + 1 : nextHead;
  }
  return { lines, heads, boldTrees, h2: heads.filter((h) => h.level === 2) };
}

const trimEnd = (ls) => {
  const out = [...ls];
  while (out.length && /^\s*(---)?\s*$/.test(out[out.length - 1])) out.pop();
  return out;
};
const comparable = (ls) => ls.map((l) => l.replace(/\s+$/, '')).filter((l) => l.trim() !== '' && l.trim() !== '---');
const kidsOf = (doc, h) => doc.heads.filter((c) => c.i > h.i && c.i < h.end && c.level === h.level + 1);
const headerOf = (doc) => trimEnd(doc.lines.slice(0, doc.h2[0]?.i ?? doc.lines.length));

/**
 * Blocs repris tels quels depuis la version de travail (même calcul à l'écriture et au contrôle).
 * DONE : scénarios sans leur introduction, baselines « déjà couverts » réduits à leur titre.
 * ABANDON / IRREPRODUCTIBLE : scénarios non repris (ABANDON : liste de titres générée à part).
 */
function keptBlocks(doc, type) {
  const blocks = [];
  for (const h of doc.h2) {
    const rule = ruleFor(h.title);
    if (rule === 'keep' || rule === 'unknown') {
      const body = trimEnd(doc.lines.slice(h.i + 1, h.end));
      // section vide (titre en double laissé par le gabarit) : rien à reprendre
      if (comparable(body).length) blocks.push({ title: h.title, rule, body });
    } else if (rule === 'adr' || (rule === 'scenarios' && type === 'DONE')) {
      const kids = kidsOf(doc, h);
      let body = trimEnd(doc.lines.slice(kids[0]?.i ?? h.i + 1, h.end));
      if (rule === 'scenarios' && /^scenarios? baseline/.test(normTitle(h.title)) && kids.length) {
        const covered = [];
        body = [];
        for (const k of kids) {
          const blk = trimEnd(doc.lines.slice(k.i, k.end));
          if (COVERED.test(blk.join('\n'))) covered.push(k.title.replace(/^Sc[ée]nario\s+/i, ''));
          else body.push(...blk, '');
        }
        if (covered.length) body.unshift(`> Déjà couverts ailleurs (texte complet : version de travail) : ${covered.join(' · ')}.`, '');
        body = trimEnd(body);
      }
      blocks.push({ title: h.title, rule, body });
    }
  }
  // Arbre de flux : extrait d'une section supprimée (souvent Architecture), promu en section
  for (const t of doc.heads.filter((x) => x.level >= 3 && isTree(x.title))) {
    const parent = doc.h2.filter((p) => p.i < t.i).pop();
    if (parent && ruleFor(parent.title) !== 'drop') continue;
    blocks.push({ title: t.title, rule: 'tree', body: trimEnd(doc.lines.slice(t.i + 1, t.end)) });
  }
  for (const t of doc.boldTrees) {
    const parent = doc.h2.filter((p) => p.i < t.i).pop();
    if (parent && ruleFor(parent.title) !== 'drop') continue;
    blocks.push({ title: t.title, rule: 'tree', body: trimEnd(doc.lines.slice(t.i + 1, t.end)) });
  }
  return blocks;
}

function withClosing(header, closing) {
  const first = header.findIndex((l) => l.startsWith('>'));
  if (first < 0) return [header[0] ?? '', '', closing, ...header.slice(1)];
  let last = first;
  while (last + 1 < header.length && header[last + 1].startsWith('>')) last++;
  return [...header.slice(0, last + 1), closing, ...header.slice(last + 1)];
}

function deliveryDate(doc) {
  const prog = doc.h2.find((h) => /^progression/.test(normTitle(h.title)));
  const row = prog && doc.lines.slice(prog.i, prog.end).find((l) => /^\|\s*7\s*\|/.test(l));
  const dates = row?.match(/\d{4}-\d{2}-\d{2}/g);
  return dates ? dates[dates.length - 1] : MARK;
}

function lotOf(doc, file) {
  const m = doc.lines.map((l) => /^> Lot\s*:\s*([A-Za-z]+\d+)(?![\w-])/.exec(l)).find(Boolean);
  return m ? m[1] : (path.basename(file, '.md').split('-').find((s) => /^[A-Z]+\d+$/.test(s)) ?? null);
}

/** Identifiants internes cités par les lignes de `.agents/` qui visent ce fichier (nom) ou ce lot (« feature `X` »). */
function externalRefs(ctx, lot) {
  const base = path.basename(ctx.relPath, '.md');
  // « feature `X` » (spec parallèle) ou forme courte du fichier (« `DONE-X` Q4 »)
  const lotRe = lot ? new RegExp(`feature \`?${lot}\`?(?![\\w-])|${ctx.type}-${lot}(?!\\w)`) : null;
  const skip = (n) => n === 'doublons' || n === 'node_modules' || n === '.git';
  const hits = [];
  for (const f of walk(path.join(ctx.top, '.agents'), skip)) {
    if (!f.endsWith('.md') || path.resolve(f) === ctx.abs) continue;
    readUtf8(f).split(/\r?\n/).forEach((l, i) => {
      if (!l.includes(base) && !(lotRe && lotRe.test(l))) return;
      // un lot cité avec son fichier (`DONE-A6-…`) n'est pas un identifiant interne
      for (const id of l.match(ID) ?? []) if (id !== lot && !l.includes(`-${id}-`)) hits.push({ id, where: `${rel(ctx.top, f)}:${i + 1}` });
    });
  }
  return hits;
}

function context(file) {
  const abs = path.resolve(file);
  const type = PREFIXES.find((p) => path.basename(abs).startsWith(`${p}-`));
  if (!type) throw new Error(`${path.basename(abs)} : seuls les fichiers DONE-*, ABANDON-*, IRREPRODUCTIBLE-* se compactent`);
  const top = path.resolve(git(path.dirname(abs), ['rev-parse', '--show-toplevel']).trim());
  return { abs, top, type, relPath: rel(top, abs) };
}

const section = (title, body) => {
  const start = body.findIndex((l) => l.trim() !== '');
  return [`## ${title}`, '', ...(start < 0 ? [] : body.slice(start)), ''];
};

function newSections(type) {
  const registre = section('Registre des décisions', [
    '| ID | Décision | Date | → Consigné dans |',
    '|---|---|---|---|',
    `| ${MARK} | | | |`,
  ]);
  if (type === 'ABANDON') {
    return {
      before: [
        ...section("Raison de l'abandon", [`- **Date** : ${MARK} · **Décidé par** : ${MARK}`, `- **Cause** : ${MARK}`, `- **Code produit** : ${MARK}`]),
        ...section('Ce qui a été tenté', [MARK]),
        ...registre,
        ...section('Questions restées ouvertes', [MARK]),
      ],
      after: [],
    };
  }
  if (type === 'IRREPRODUCTIBLE') {
    return {
      before: [
        ...section('Symptôme signalé', [`- **Source** : ${MARK} · **Date du symptôme** : ${MARK} · **Environnement** : ${MARK}`, `- **Description** : ${MARK}`]),
        ...section('Hypothèses testées et éliminées', ['| Hypothèse | Test mené | Preuve d\'élimination |', '|---|---|---|', `| ${MARK} | | |`]),
        ...section('Données et journaux examinés', [`- ${MARK}`]),
        ...section('Conditions de réouverture', [`- ${MARK}`]),
      ],
      after: [],
    };
  }
  return {
    registre,
    dette: section('Dette connue', ['| # | Edge case / sujet | Repris par | Justification |', '|---|---|---|---|', `| ${MARK} | | | |`, '', `Couverts : ${MARK}`]),
    fin: [
      ...section('Leçons de réalisation', [`- ${MARK}`]),
      ...section('Vigilances', [`- ${MARK}`]),
      ...section('Traçabilité', [
        `- **Spec et US** : ${MARK}`,
        `- **Spec parallèle** : ${MARK}`,
        `- **Conventions établies** : ${MARK}`,
        `- **Utilitaires référencés** : ${MARK}`,
      ]),
    ],
  };
}

function render(doc, ctx, hash) {
  const blocks = keptBlocks(doc, ctx.type);
  const emit = (pred) => blocks.filter(pred).flatMap((b) => section(b.title, b.body));
  const versionLine = `version de travail : \`git show ${hash}:${ctx.relPath}\``;
  const closing = {
    DONE: `> Clôturé le ${deliveryDate(doc)} · test global ${MARK} · ${versionLine}`,
    ABANDON: `> Abandonné le ${MARK} · ${versionLine}`,
    IRREPRODUCTIBLE: `> Clôturé (irreproductible) le ${MARK} · ${versionLine}`,
  }[ctx.type];
  const out = [...withClosing(headerOf(doc), closing), ''];
  const isResume = (b) => /^resume metier/.test(normTitle(b.title));
  const isRecette = (b) => /^recette manuelle/.test(normTitle(b.title));
  const n = newSections(ctx.type);
  if (ctx.type === 'DONE') {
    out.push(...emit(isResume), ...n.registre, ...emit((b) => b.rule === 'scenarios'), ...n.dette);
    out.push(...emit((b) => b.rule === 'tree'), ...emit((b) => b.rule === 'adr'), ...n.fin);
    out.push(...emit((b) => b.rule === 'keep' && !isResume(b) && !isRecette(b)), ...emit(isRecette), ...emit((b) => b.rule === 'unknown'));
  } else {
    const present = new Set(blocks.map((b) => normTitle(b.title)));
    out.push(...emit(isResume));
    // sections du gabarit déjà présentes dans la version de travail : reprises telles quelles, pas de doublon
    const before = [];
    let skipping = false;
    for (const l of n.before) {
      if (l.startsWith('## ')) skipping = present.has(normTitle(l.slice(3)));
      if (!skipping) before.push(l);
    }
    out.push(...before, ...emit((b) => b.rule === 'keep' && !isResume(b) && !isRecette(b)));
    if (ctx.type === 'ABANDON') {
      const titles = doc.h2.filter((h) => ruleFor(h.title) === 'scenarios').flatMap((h) => kidsOf(doc, h).map((k) => `- ${k.title.replace(/^Sc[ée]nario\s+/i, '')}`));
      if (titles.length) out.push(...section('Scénarios (titres)', titles));
    }
    out.push(...emit((b) => b.rule === 'adr'), ...emit(isRecette), ...emit((b) => b.rule === 'unknown'));
  }
  return `${trimEnd(out).join('\n')}\n`;
}

/** Écrit le squelette compacté (ou le décrit seulement avec `dryRun`) et rend compte du travail restant. */
export function compactFeature({ file, dryRun = false }) {
  const ctx = context(file);
  const hash = git(ctx.top, ['log', '-1', '--format=%h', '--', ctx.relPath]).trim();
  if (!hash) throw new Error(`${ctx.relPath} n'a jamais été committé : committer la livraison d'abord`);
  if (git(ctx.top, ['status', '--porcelain', '--', ctx.relPath]).trim()) throw new Error(`${ctx.relPath} a des modifications locales : committer (ou annuler) d'abord`);
  const original = git(ctx.top, ['show', `${hash}:${ctx.relPath}`]);
  const doc = parse(original);
  if (doc.lines.some((l) => CLOSING.test(l))) throw new Error(`${ctx.relPath} est déjà compacté`);

  const copy = path.join(os.tmpdir(), 'workflow-kit-compact', `${hash}-${path.basename(ctx.abs)}`);
  writeUtf8(copy, original);
  const next = render(doc, ctx, hash);
  if (!dryRun) writeUtf8(ctx.abs, next);

  const blocks = keptBlocks(doc, ctx.type);
  const say = (s) => console.log(s);
  say(`[compact] ${ctx.relPath} (${ctx.type}) : version de travail ${hash}${dryRun ? ' — simulation, rien n\'est écrit' : ''}`);
  say(`  repris tel quel : ${blocks.filter((b) => b.rule !== 'unknown').map((b) => b.title).join(' · ') || 'aucun'}`);
  const unknown = blocks.filter((b) => b.rule === 'unknown');
  if (unknown.length) say(`  hors grille (repris, à trancher) : ${unknown.map((b) => b.title).join(' · ')}`);
  say(`  résiduel à examiner (copie numérotée : ${copy}) :`);
  for (const h of doc.h2.filter((x) => ruleFor(x.title) === 'drop' || (ruleFor(x.title) === 'scenarios' && ctx.type !== 'DONE'))) {
    say(`    l.${h.i + 1}-${h.end}  ${h.title}`);
    for (const k of kidsOf(doc, h)) say(`      l.${k.i + 1}-${k.end}  ${k.title}`);
  }
  const refs = externalRefs(ctx, lotOf(doc, ctx.abs));
  say(refs.length ? '  renvois externes (identifiants à garder résolvables) :' : '  renvois externes : aucun identifiant interne cité ailleurs');
  for (const r of refs) say(`    ${r.id.padEnd(7)} ← ${r.where}`);
  const marks = next.split('\n').filter((l) => l.includes(MARK)).length;
  say(`  à compléter : ${marks} × ${MARK} (une section sans contenu se supprime entièrement)`);
  say(`  ensuite : node workflow-kit/bin/workflow-kit.mjs compact ${ctx.relPath} --check`);
  return 0;
}

/** Contrôle un fichier compacté ; code de sortie 1 en cas d'écart bloquant. */
export function checkCompaction({ file }) {
  const ctx = context(file);
  const text = readUtf8(ctx.abs);
  const doc = parse(text);
  const closing = doc.lines.find((l) => CLOSING.test(l));
  if (!closing) throw new Error(`${ctx.relPath} : ligne de clôture absente (fichier non compacté ?)`);
  const hash = CLOSING.exec(closing)[2];
  const original = git(ctx.top, ['show', `${hash}:${ctx.relPath}`]);
  const orig = parse(original);
  const errors = [];
  const warnings = [];

  doc.lines.forEach((l, i) => l.includes(MARK) && errors.push(`l.${i + 1} : ${MARK} non résolu`));

  const header = headerOf(doc).filter((l) => !CLOSING.test(l));
  if (comparable(header).join('\n') !== comparable(headerOf(orig)).join('\n')) errors.push('en-tête modifié (hors ligne de clôture)');

  // titres en double : appariés dans l'ordre d'apparition
  const now = new Map();
  for (const h of doc.h2) now.set(h.title, [...(now.get(h.title) ?? []), trimEnd(doc.lines.slice(h.i + 1, h.end))]);
  for (const b of keptBlocks(orig, ctx.type)) {
    const cur = now.get(b.title)?.shift();
    if (!cur) {
      (b.rule === 'unknown' ? warnings : errors).push(`section reprise absente : « ${b.title} »`);
      continue;
    }
    const a = comparable(b.body);
    const c = comparable(cur);
    const k = a.findIndex((l, j) => l !== c[j]);
    if (k >= 0 || a.length !== c.length) {
      const at = k >= 0 ? k : Math.min(a.length, c.length);
      errors.push(`« ${b.title} » diffère de la version de travail : « ${a[at] ?? '(fin)'} » / « ${c[at] ?? '(fin)'} »`);
    }
  }

  for (const r of externalRefs(ctx, lotOf(orig, ctx.abs))) {
    const re = new RegExp(`(?<![\\w-])${r.id}(?![\\w-])`);
    if (!re.test(text)) warnings.push(`${r.id} cité par ${r.where} : absent du fichier (vérifier)`);
  }

  const size = (t) => `${t.replace(/\r\n/g, '\n').split('\n').length} lignes, ${Buffer.byteLength(t)} octets`;
  console.log(`[compact --check] ${ctx.relPath} : ${size(original)} → ${size(text)}`);
  for (const w of [...new Set(warnings)]) console.log(`  ATTENTION ${w}`);
  for (const e of errors) console.log(`  ECART ${e}`);
  console.log(errors.length ? `  ${errors.length} écart(s) bloquant(s).` : '  OK : sections reprises identiques, aucun marqueur restant.');
  return errors.length ? 1 : 0;
}
