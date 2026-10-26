import fs from 'node:fs';
import path from 'node:path';
import { exists, readUtf8, rel, walk } from './util.mjs';

/** Titre normalisé : sans accents, emphase, guillemets, ni casse. */
const norm = (s) =>
  s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[«»"`*]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
const headingsOf = (text) => text.split(/\r?\n/).filter((l) => /^#{1,6}\s/.test(l)).map((l) => norm(l.replace(/^#+\s+/, '')));
const linesOf = (text) => text.split(/\r?\n/);

/**
 * Cohérence interne du core : ce qu'un texte cite doit exister.
 * a. chemins `workflow-kit/…` (dans le kit) et `.agents/…` (dans les seeds des packs ou du projet) ;
 * b. renvois « fichier § Titre » et « § « Titre » » (même fichier) vers un titre réel ;
 * c. sections du fichier de feature citées (`## …` / `### …`) présentes dans un gabarit ;
 * d. commandes du CLI citées ;
 * e. restes d'anciennes versions du workflow.
 * Renvoie la liste des écarts (`fichier:ligne  message`).
 */
export function auditCore(kitRoot) {
  const problems = [];
  const coreDir = path.join(kitRoot, 'core');
  const files = walk(coreDir, (n) => n === 'node_modules').filter((f) => f.endsWith('.md'));
  const texts = new Map(files.map((f) => [f, readUtf8(f)]));
  const at = (f, i, msg) => problems.push(`${rel(kitRoot, f)}:${i + 1}  ${msg}`);

  // Seeds : ce que `.agents/…` désigne une fois le kit installé
  const seedRoots = [
    ...fs.readdirSync(path.join(kitRoot, 'packs'), { withFileTypes: true }).filter((d) => d.isDirectory()).map((d) => path.join(kitRoot, 'packs', d.name, 'agents')),
    path.join(kitRoot, 'project', 'agents'),
  ];
  const seedExists = (p) => seedRoots.some((r) => exists(path.join(r, p)));

  const templates = ['feature.md', 'feature-cloturee.md'].map((n) => path.join(coreDir, 'templates', n)).filter(exists);
  const templateHeads = templates.flatMap((t) => headingsOf(readUtf8(t)));

  const byBase = (name) => files.find((f) => path.basename(f) === name);
  const cli = readUtf8(path.join(kitRoot, 'bin', 'workflow-kit.mjs'));
  const commands = new Set(['init', 'sync', 'verify', ...[...cli.matchAll(/command === '([\w-]+)'/g)].map((m) => m[1])]);

  const STALE = [
    [/ARRÊT OBLIGATOIRE/, 'ancienne consigne « ARRÊT OBLIGATOIRE » (un subagent rend son rapport)'],
    [/attends? le mot/i, 'ancienne consigne « attends le mot go » dans un texte de subagent'],
    [/pre-commit|--staged|--no-verify/, 'hook git (supprimé : le Build lance le contrôle)'],
    [/lus? systématiquement|consulter systématiquement/i, 'lecture systématique (remplacée par la lecture ciblée)'],
    [/maintenu automatiquement/i, 'formule « maintenu automatiquement » (le Build écrit, sur accord)'],
  ];

  for (const [f, text] of texts) {
    const isTemplateFile = f.includes(`${path.sep}templates${path.sep}`);
    const citesClosed = /compacter-feature|skills[\\/]doc[\\/]|cadrage-po|analyse-flashback/.test(f);
    linesOf(text).forEach((line, i) => {
      // a. chemins
      for (const m of line.matchAll(/`([^`\s]+)`/g)) {
        const p = m[1].replace(/#.*$/, '').replace(/:\d+.*$/, '');
        if (/[<>*{}]|\.\.\.|…/.test(p)) continue;
        if (p.startsWith('workflow-kit/')) {
          if (!exists(path.join(kitRoot, p.slice('workflow-kit/'.length)))) at(f, i, `chemin introuvable dans le kit : ${p}`);
        } else if (p.startsWith('.agents/') && !p.startsWith('.agents/feature/')) {
          if (!seedExists(p.slice('.agents/'.length))) at(f, i, `chemin .agents/ absent des seeds (packs/*/agents, project/agents) : ${p}`);
        }
      }

      // b. renvois « § »
      const refs = [];
      for (const m of line.matchAll(/`?([\w./-]+\.md)`?((?:\s*(?:§|et §)\s*(?:«\s*[^»]+»|[^;,.)(\n§]+?(?=\s+et\s+§|[;,.)(]|$)))+)/g)) {
        for (const t of m[2].matchAll(/§\s*(?:«\s*([^»]+)»|([^;,.)(\n§]+?)(?=\s+et\s+§|[;,.)(]|$))/g)) refs.push([m[1], (t[1] ?? t[2]).trim()]);
      }
      for (const m of line.matchAll(/(?<![\w.`])§\s*«\s*([^»]+)»/g)) {
        const before = line.slice(0, m.index);
        if (!/\.md`?\s*(?:,\s*)?$/.test(before)) refs.push([f, m[1].trim()]);
      }
      for (const [fileName, title] of refs) {
        // Renvoi au même fichier, ou chemin complet `workflow-kit/…` : fichier exact (plusieurs `SKILL.md` coexistent) ; sinon par nom.
        const fullPath = fileName.startsWith('workflow-kit/') ? path.join(kitRoot, fileName.slice('workflow-kit/'.length)) : null;
        const target = texts.has(fileName) ? fileName : fullPath && texts.has(fullPath) ? fullPath : byBase(path.basename(fileName));
        if (!target) {
          if (!/^(ui-rules|component-rules|conventions|spec-parallele)\.md$/.test(path.basename(fileName))) at(f, i, `renvoi § vers un fichier inconnu du core : ${fileName}`);
          continue;
        }
        const want = norm(title);
        const shown = texts.has(fileName) ? rel(kitRoot, fileName) : fileName;
        if (!headingsOf(texts.get(target)).some((h) => h.includes(want))) at(f, i, `renvoi § vers un titre absent : ${shown} § « ${title} »`);
      }

      // c. sections du fichier de feature citées
      if (!isTemplateFile) {
        for (const m of line.matchAll(/`(#{2,3}) ([^`]+)`/g)) {
          const h = m[2].replace(/<[^>]*>/g, '').replace(/\s*\(étape \d\)$/, '').trim();
          if (!h || /^(SP-|Scénario|ADR-|…)/.test(h) || /^\d+\./.test(h)) continue;
          if (citesClosed && /^(Dette connue|Leçons de réalisation|Vigilances|Traçabilité|Arbre de flux)$/.test(h)) continue;
          if (!templateHeads.some((x) => x.startsWith(norm(h)))) at(f, i, `section citée absente des gabarits de feature : ${m[1]} ${h}`);
        }
      }

      // d. commandes du CLI
      for (const m of line.matchAll(/workflow-kit(?:\.mjs)?\s+([a-z][\w-]*)\b/g)) {
        if (['core', 'bin', 'sync'].includes(m[1]) && m[1] !== 'sync') continue;
        if (/^(core|bin|est|imbrique|du|et)$/.test(m[1])) continue;
        if (!commands.has(m[1])) at(f, i, `commande CLI inconnue : workflow-kit ${m[1]}`);
      }

      // e. restes d'anciennes versions
      for (const [re, label] of STALE) if (re.test(line)) at(f, i, label);
    });
  }
  return problems;
}
