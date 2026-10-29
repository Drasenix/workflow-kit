import { execFileSync } from 'node:child_process';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { readUtf8, rel, walk, writeUtf8 } from './util.mjs';

/**
 * Compaction d'un fichier de feature clos (skill `compacter-feature`), partie mécanique :
 * - `compactFeature` : squelette depuis la version committée ; les sections conservées sont recopiées
 *   à l'octet près, les sections à rédiger portent le marqueur MARK ;
 * - `checkCompaction` : marqueurs résolus, en-tête et sections conservées identiques à la version de travail,
 *   arbres de flux présents, blocs libres tranchés, renvois externes présents.
 *
 * Ce qui se garde est repéré par des emplacements du gabarit (`core/templates/feature.md`) et par le contenu
 * (arbre = bloc de code en `├─` / `└─`), jamais par un libellé deviné. Ce que le gabarit ne prévoit pas
 * (« bloc libre ») doit être tranché : gardé à l'identique, ou cité dans la ligne « Écarté à la compaction ».
 */

export const MARK = '[À COMPLÉTER]';

const PREFIXES = ['DONE', 'ABANDON', 'IRREPRODUCTIBLE'];
const CLOSING = /^> (Clôturé|Abandonné).*version de travail : `git show ([0-9a-f]{4,40}):/;
const ECARTE = '> Écarté à la compaction (texte complet : version de travail) :';
const ECARTE_LINE = /^> Écarté à la compaction\b/;
// Scénario entièrement couvert ailleurs : « ⏭️ déjà couvert … » / « ⏭️ obsolète … » (ou note de citation « > ⏭️ »).
// Un ⏭️ partiel (« ⏭️ D1 déjà couvert » : seule une liste l'est) ne réduit PAS le scénario à son titre.
const COVERED = /⏭️\s*\**\s*(?:d[ée]j[àa] couverts?|obsol[èe]te)|^> ⏭️/im;
const ID = /(?<![\w-])(?:Q-[A-Z]?\d+[a-z]?|QS-\d+|Q\d+|A\d+|EC-\d+|ADR-\d+|[BE]\d+|R-\d+|P-\d+|D-\d+|C\d+)(?![\w-])/g;
const TREE_GLYPH = /[├└]─/;
const PSEUDO = /^\*\*([^*]{3,90})\*\*\s*(\([^)]*\))?\s*:?\s*$/;

const plain = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
const normTitle = (t) => plain(t).replace(/\s*\([^)]*\)\s*$/, '').replace(/^\d+\.\s*/, '').trim();
// texte sans accents ni mise en forme ; clé de citation d'un bloc libre = ses 30 premiers caractères
const flat = (s) => plain(s).replace(/[*`_]/g, '').replace(/\s+/g, ' ');
const keyOf = (s) => flat(s).replace(/^[>\-\s]+/, '').trim().slice(0, 30);

// Sort d'une section de niveau 2, sur le titre normalisé (sans accents ni suffixe « (étape n) »)
const SECTION_RULES = [
  [/^resume metier/, 'keep'],
  [/^registre des decisions/, 'registre'],
  [/^cle de lecture/, 'lecture'],
  [/^scenarios?\b/, 'scenarios'],
  [/^decisions? & justifications|^adr\b/, 'adr'],
  [/^recette manuelle/, 'keep'],
  [/^(raison de l'abandon|ce qui a ete tente|questions restees ouvertes|symptome|hypotheses|donnees et journaux|conditions de reouverture)/, 'keep'],
  [/^(progression|specs consultees|questions specs|contexte technique|edge cases|ambiguites|arbitrages du challenge|conventions|architecture|plan\b|revue qualite|nuances consignees|decisions utilisateur)/, 'drop'],
];
const ruleFor = (title) => (SECTION_RULES.find(([re]) => re.test(normTitle(title))) ?? [null, 'unknown'])[1];
const isTree = (title) => /^arbre\b/.test(normTitle(title));

// Blocs libres : cherchés dans les sections supprimées rédigées librement (Plan ou Architecture, Revue), hors sous-sections de pilotage.
const FREE_ZONE = /^(architecture|plan\b|revue qualite)/;
const PILOT_SUB = /^(fichiers a creer|code existant|contrat d'implementation|signatures publiques|choix structurants|ecarts au plan|questions a l'utilisateur|nouveaux utilitaires|checklist|plan de refacto|verdict et verifications|edge cases metier|decisions techniques|decisions utilisateur|reponses)/;
// sous-sections produites par le workflow sans figurer au gabarit
const STD_SUB = /^(re-verification|decisions utilisateur|reponses|edge cases metier|arbre\b|adr-\d+|scenario\b)/;

// Gabarit de feature : ses lignes de consigne (« > … ») ne sont pas reprises ; ses titres délimitent les blocs libres.
const TEMPLATE = fileURLToPath(new URL('../core/templates/feature.md', import.meta.url));
// Consignes d'anciennes versions du gabarit, dans les sections reprises : un fichier ouvert avant leur reformulation est filtré pareil.
const LEGACY_QUOTES = [
  "> Tenu par le Build **à chaque pause** : une ligne par réponse de l'utilisateur (question, ambiguïté, question d'architecture ou de revue, accord explicite, « go refacto »). Le texte des questions reste dans leur section ; seule la décision vient ici. La colonne « Consigné dans » se complète au plus tard à l'étape 6. Repris tel quel à la compaction.",
];
let template;
function templateInfo() {
  if (template) return template;
  let lines = [];
  try {
    lines = readUtf8(TEMPLATE).split(/\r?\n/);
  } catch {
    // gabarit introuvable : aucune consigne filtrée, tout titre est libre
  }
  template = {
    quotes: new Set([...lines.map((l) => l.trim()).filter((l) => l.startsWith('>')), ...LEGACY_QUOTES]),
    heads: new Set(lines.map((l) => /^#{2,4}\s+(.*\S)/.exec(l)).filter(Boolean).map((m) => normTitle(m[1]))),
  };
  return template;
}
// sans les consignes du gabarit, ni les lignes vides ou « > » seules laissées en bord de bloc
function stripGuidance(ls) {
  const kept = ls.filter((l) => !templateInfo().quotes.has(l.trim()));
  let a = 0;
  let b = kept.length;
  while (a < b && /^\s*>?\s*$/.test(kept[a])) a++;
  while (b > a && /^\s*(>|---)?\s*$/.test(kept[b - 1])) b--;
  return kept.slice(a, b);
}

const git = (cwd, args) => execFileSync('git', args, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });

/**
 * Titres et pseudo-titres en gras hors blocs de code, blocs de code ; fin d'un titre = titre suivant de niveau <=.
 * `boldTrees` : arbres écrits en paragraphe gras (« **Arbre d'exécution** ») suivis d'un bloc de code.
 */
function parse(text) {
  const lines = text.replace(/\r\n/g, '\n').split('\n');
  const heads = [];
  const boldTrees = [];
  const pseudos = [];
  const codes = [];
  let open = -1;
  lines.forEach((l, i) => {
    if (/^\s*(```|~~~)/.test(l)) {
      if (open < 0) open = i;
      else {
        codes.push({ a: open, b: i });
        open = -1;
      }
    } else if (open < 0) {
      const m = /^(#{1,6})\s+(.*\S)\s*$/.exec(l);
      if (m) heads.push({ i, level: m[1].length, title: m[2] });
      const p = PSEUDO.exec(l);
      if (p) pseudos.push({ i, label: p[1].trim() });
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
    const nextHead = heads.find((h) => h.i > t.i)?.i ?? lines.length;
    const code = codes.find((c) => c.a > t.i);
    t.end = code && code.b < nextHead ? code.b + 1 : nextHead;
  }
  return { lines, heads, boldTrees, pseudos, codes, h2: heads.filter((h) => h.level === 2) };
}

const trimEnd = (ls) => {
  const out = [...ls];
  while (out.length && /^\s*(---)?\s*$/.test(out[out.length - 1])) out.pop();
  return out;
};
const comparable = (ls) => ls.map((l) => l.replace(/\s+$/, '')).filter((l) => l.trim() !== '' && l.trim() !== '---');
const contains = (hay, needle) => needle.length > 0 && `\n${hay.join('\n')}\n`.includes(`\n${needle.join('\n')}\n`);
const kidsOf = (doc, h) => doc.heads.filter((c) => c.i > h.i && c.i < h.end && c.level === h.level + 1);
const headerOf = (doc) => trimEnd(doc.lines.slice(0, doc.h2[0]?.i ?? doc.lines.length));
const parentOf = (doc, i) => doc.h2.filter((p) => p.i < i).pop();
// ligne de texte qui introduit un bloc (« Flux cible … : », « **Chaîne de contrôles** … ») ; '' si titre, tableau ou rien
function labelBefore(lines, a) {
  for (let k = a - 1; k >= Math.max(0, a - 3); k--) {
    const t = lines[k].trim();
    if (!t) continue;
    return /^(#|\||```|~~~)/.test(t) ? '' : t;
  }
  return '';
}
const tableRows = (ls) => ls.filter((l) => /^\s*\|/.test(l)).slice(2).filter((l) => /[^\s|]/.test(l));

/**
 * Blocs repris tels quels depuis la version de travail (même calcul à l'écriture et au contrôle).
 * DONE : registre tenu en direct, clé de lecture, scénarios avec leur introduction (hors consignes du gabarit),
 * baselines entièrement couvertes réduites à leur titre, arbres de flux, ADR.
 * ABANDON / IRREPRODUCTIBLE : scénarios non repris (ABANDON : liste de titres générée à part).
 */
function keptBlocks(doc, type) {
  const blocks = [];
  for (const h of doc.h2) {
    const rule = ruleFor(h.title);
    const raw = trimEnd(doc.lines.slice(h.i + 1, h.end));
    if (rule === 'keep' || rule === 'unknown') {
      // section vide (titre en double laissé par le gabarit) : rien à reprendre
      if (comparable(raw).length) blocks.push({ title: h.title, rule, body: raw });
    } else if (rule === 'registre') {
      // registre tenu en direct : repris s'il porte au moins une décision
      const body = trimEnd(stripGuidance(raw));
      if (tableRows(body).length) blocks.push({ title: h.title, rule, body });
    } else if (rule === 'lecture' && type === 'DONE') {
      const body = trimEnd(stripGuidance(raw));
      if (comparable(body).some((l) => !/^`?aucune?`?\.?$/i.test(l.trim()))) blocks.push({ title: h.title, rule, body });
    } else if (rule === 'adr' || (rule === 'scenarios' && type === 'DONE')) {
      const kids = kidsOf(doc, h);
      // introduction (texte avant le premier sous-titre) : reprise, sauf les consignes du gabarit
      const intro = trimEnd(stripGuidance(doc.lines.slice(h.i + 1, kids[0]?.i ?? h.end)));
      let rest = kids.length ? trimEnd(doc.lines.slice(kids[0].i, h.end)) : [];
      if (rule === 'scenarios' && /^scenarios? baseline/.test(normTitle(h.title)) && kids.length) {
        const covered = [];
        rest = [];
        for (const k of kids) {
          const blk = trimEnd(doc.lines.slice(k.i, k.end));
          // seuls les scénarios (« ### Scénario … ») se réduisent à leur titre ; une autre sous-section est reprise telle quelle
          if (/^Sc[ée]nario\b/i.test(k.title) && COVERED.test(blk.join('\n'))) covered.push(k.title.replace(/^Sc[ée]nario\s+/i, ''));
          else rest.push(...blk, '');
        }
        if (covered.length) rest.unshift(`> Déjà couverts ailleurs (texte complet : version de travail) : ${covered.join(' · ')}.`, '');
        rest = trimEnd(rest);
      }
      const keepIntro = rule === 'scenarios' && comparable(intro).length > 0;
      blocks.push({ title: h.title, rule, body: trimEnd([...(keepIntro ? [...intro, ''] : []), ...rest]) });
    }
  }
  // Arbre de flux sous un titre « Arbre … » ou un paragraphe gras « **Arbre …** », dans une section supprimée
  const ranges = [];
  for (const t of doc.heads.filter((x) => x.level >= 3 && isTree(x.title))) {
    const parent = parentOf(doc, t.i);
    if (parent && ruleFor(parent.title) !== 'drop') continue;
    ranges.push([t.i, t.end]);
    blocks.push({ title: t.title, rule: 'tree', body: trimEnd(doc.lines.slice(t.i + 1, t.end)) });
  }
  for (const t of doc.boldTrees) {
    const parent = parentOf(doc, t.i);
    if (parent && ruleFor(parent.title) !== 'drop') continue;
    ranges.push([t.i, t.end]);
    blocks.push({ title: t.title, rule: 'tree', body: trimEnd(doc.lines.slice(t.i + 1, t.end)) });
  }
  // … et tout autre arbre, repéré par son contenu (quel que soit son libellé)
  for (const c of doc.codes) {
    if (!doc.lines.slice(c.a + 1, c.b).some((l) => TREE_GLYPH.test(l))) continue;
    const parent = parentOf(doc, c.a);
    if (!parent || ruleFor(parent.title) !== 'drop') continue;
    if (ranges.some(([s, e]) => c.a > s && c.b < e)) continue;
    blocks.push({ title: 'Arbre de flux', rule: 'tree-code', body: doc.lines.slice(c.a, c.b + 1), label: labelBefore(doc.lines, c.a), from: c.a, to: c.b + 1 });
  }
  return blocks;
}

/**
 * Blocs libres de la version de travail : titre hors gabarit, pseudo-titre en gras, bloc de code (hors arbre),
 * dans Architecture / Revue, hors sous-sections de pilotage. Chacun est à garder ou à écarter explicitement.
 */
function freeItems(doc) {
  const { lines } = doc;
  const items = [];
  const headAt = new Map(doc.heads.map((h) => [h.i, h]));
  const codeAt = new Map(doc.codes.map((c) => [c.a, c]));
  const stops = [...doc.heads.map((h) => h.i), ...doc.pseudos.map((p) => p.i)].sort((x, y) => x - y);
  let h2 = null;
  const stack = [];
  const inZone = () => h2 && ruleFor(h2.title) === 'drop' && FREE_ZONE.test(normTitle(h2.title));
  const blocked = () => stack.some((s) => s.free || PILOT_SUB.test(normTitle(s.title)));
  for (let i = 0; i < lines.length; i++) {
    const c = codeAt.get(i);
    if (c) {
      if (inZone() && !blocked() && !lines.slice(c.a + 1, c.b).some((l) => TREE_GLYPH.test(l))) {
        items.push({ kind: 'code', label: labelBefore(lines, c.a) || `bloc de code l.${c.a + 1}`, from: c.a, to: c.b + 1, body: lines.slice(c.a, c.b + 1) });
      }
      i = c.b;
      continue;
    }
    const h = headAt.get(i);
    if (h) {
      if (h.level <= 2) {
        h2 = h.level === 2 ? h : null;
        stack.length = 0;
        continue;
      }
      while (stack.length && stack[stack.length - 1].level >= h.level) stack.pop();
      const free = !templateInfo().heads.has(normTitle(h.title)) && !STD_SUB.test(normTitle(h.title));
      if (free && inZone() && !blocked()) items.push({ kind: 'titre', label: h.title, from: h.i, to: h.end, body: lines.slice(h.i + 1, h.end) });
      stack.push({ ...h, free });
      continue;
    }
    const p = PSEUDO.exec(lines[i]);
    if (p && !isTree(p[1]) && inZone() && !blocked()) {
      const to = stops.find((s) => s > i) ?? lines.length;
      items.push({ kind: 'gras', label: p[1].trim(), from: i, to, body: lines.slice(i + 1, to) });
    }
  }
  return items;
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
        ...registre,
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
  const emit = (pred) => blocks.filter(pred).flatMap((b) => section(b.title, b.label ? [b.label, '', ...b.body] : b.body));
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
  const registre = blocks.some((b) => b.rule === 'registre');
  if (ctx.type === 'DONE') {
    out.push(...emit(isResume), ...(registre ? emit((b) => b.rule === 'registre') : n.registre));
    out.push(...emit((b) => b.rule === 'lecture'), ...emit((b) => b.rule === 'scenarios'), ...n.dette);
    out.push(...emit((b) => b.rule === 'tree' || b.rule === 'tree-code'), ...emit((b) => b.rule === 'adr'), ...n.fin);
    out.push(...emit((b) => b.rule === 'keep' && !isResume(b) && !isRecette(b)), ...emit(isRecette), ...emit((b) => b.rule === 'unknown'));
  } else {
    // sections du gabarit déjà présentes dans la version de travail : reprises à leur place, pas de doublon
    const kept = new Map(blocks.filter((b) => b.rule === 'keep' || b.rule === 'registre').map((b) => [normTitle(b.title), b]));
    const placed = new Set();
    const before = [];
    let skipping = false;
    for (const l of n.before) {
      if (l.startsWith('## ')) {
        const b = kept.get(normTitle(l.slice(3)));
        skipping = Boolean(b);
        if (b) {
          before.push(...section(b.title, b.body));
          placed.add(b);
        }
      }
      if (!skipping) before.push(l);
    }
    out.push(...emit(isResume), ...before, ...emit((b) => b.rule === 'keep' && !placed.has(b) && !isResume(b) && !isRecette(b)));
    if (ctx.type === 'ABANDON') {
      const titles = doc.h2.filter((h) => ruleFor(h.title) === 'scenarios').flatMap((h) => kidsOf(doc, h).map((k) => `- ${k.title.replace(/^Sc[ée]nario\s+/i, '')}`));
      if (titles.length) out.push(...section('Scénarios (titres)', titles));
    }
    out.push(...emit((b) => b.rule === 'adr'), ...emit(isRecette), ...emit((b) => b.rule === 'unknown'));
  }
  const res = trimEnd(out);
  if (freeItems(doc).length) res.push('', `${ECARTE} ${MARK}`);
  return `${res.join('\n')}\n`;
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
  if (!blocks.some((b) => b.rule === 'registre')) say('  registre : non tenu en direct → à rédiger depuis les décisions de la version de travail');
  say(`  résiduel à examiner (copie numérotée : ${copy}) :`);
  for (const h of doc.h2.filter((x) => ruleFor(x.title) === 'drop' || (ruleFor(x.title) === 'scenarios' && ctx.type !== 'DONE'))) {
    say(`    l.${h.i + 1}-${h.end}  ${h.title}`);
    for (const k of kidsOf(doc, h)) say(`      l.${k.i + 1}-${k.end}  ${k.title}`);
  }
  const items = freeItems(doc);
  if (items.length) {
    say('  blocs libres à trancher : garder à l\'identique, ou citer (libellé + motif) dans la dernière ligne « Écarté à la compaction » :');
    for (const it of items) say(`    l.${it.from + 1}-${it.to}  ${it.kind} « ${it.label.slice(0, 70)} »`);
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
  const all = comparable(doc.lines);

  doc.lines.forEach((l, i) => l.includes(MARK) && errors.push(`l.${i + 1} : ${MARK} non résolu`));

  const header = headerOf(doc).filter((l) => !CLOSING.test(l));
  if (comparable(header).join('\n') !== comparable(headerOf(orig)).join('\n')) errors.push('en-tête modifié (hors ligne de clôture)');

  // titres en double : appariés dans l'ordre d'apparition
  const now = new Map();
  for (const h of doc.h2) now.set(h.title, [...(now.get(h.title) ?? []), trimEnd(doc.lines.slice(h.i + 1, h.end))]);
  for (const b of keptBlocks(orig, ctx.type)) {
    if (b.rule === 'tree-code') {
      // arbre repéré par son contenu : présent à l'identique, sous n'importe quel titre
      if (!contains(all, comparable(b.body))) errors.push(`arbre de flux absent (version de travail l.${b.from + 1}-${b.to}${b.label ? ` : « ${b.label.slice(0, 50)} »` : ''})`);
      continue;
    }
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

  // blocs libres : gardés à l'identique, ou cités dans la ligne « Écarté à la compaction »
  const ecarte = doc.lines.find((l) => ECARTE_LINE.test(l));
  const cited = ecarte ? flat(ecarte) : '';
  for (const it of freeItems(orig)) {
    if (contains(all, comparable(it.body))) continue;
    if (cited.includes(keyOf(it.label))) continue;
    errors.push(`bloc libre non tranché (version de travail l.${it.from + 1}) : ${it.kind} « ${it.label.slice(0, 60)} » — le garder à l'identique, ou le citer dans la ligne « Écarté à la compaction »`);
  }

  for (const r of externalRefs(ctx, lotOf(orig, ctx.abs))) {
    const re = new RegExp(`(?<![\\w-])${r.id}(?![\\w-])`);
    if (!re.test(text)) warnings.push(`${r.id} cité par ${r.where} : absent du fichier (vérifier)`);
  }

  const size = (t) => `${t.replace(/\r\n/g, '\n').split('\n').length} lignes, ${Buffer.byteLength(t)} octets`;
  console.log(`[compact --check] ${ctx.relPath} : ${size(original)} → ${size(text)}`);
  for (const w of [...new Set(warnings)]) console.log(`  ATTENTION ${w}`);
  for (const e of errors) console.log(`  ECART ${e}`);
  console.log(errors.length ? `  ${errors.length} écart(s) bloquant(s).` : '  OK : sections reprises identiques, arbres présents, blocs libres tranchés, aucun marqueur restant.');
  return errors.length ? 1 : 0;
}
