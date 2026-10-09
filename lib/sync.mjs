import path from 'node:path';
import { exists, isLink, logger, move, readUtf8, rel, removeLink, today, walk, writeUtf8 } from './util.mjs';
import { adapters, parseRuntimes } from './adapters.mjs';
import { ensureGitignore } from './gitignore.mjs';
import { migrateProjectRefs } from './migrate.mjs';

const TOKEN_RE = /\{\{[A-Z0-9_]+\}\}|<Projet>|YYYY-MM-DD/g;

// Anciens contenus techno de .opencode/ -> .agents/
const LEGACY = [
  ['agent-frontend.md', 'ui-rules.md'],
  ['agent-livewire.md', 'component-rules.md'],
  ['templates-index.md', 'templates-index.md'],
  ['doc/reference-utilitaires.md', 'reference-utilitaires.md'],
  ['templates/backend', 'templates/backend'],
  ['templates/frontend', 'templates/frontend'],
  ['templates/tests', 'templates/tests'],
  ['skills/tests', 'skills/tests'],
  ['skills/recette', 'skills/recette'],
  ['skills/migrate-fresh', 'skills/migrate-fresh'],
];

export function readConfig(kitRoot) {
  const p = path.join(kitRoot, 'workflow.config.json');
  return exists(p) ? JSON.parse(readUtf8(p)) : {};
}

/** Runtimes à générer : option explicite > workflow.config.json > opencode seul (rétro-compatibilité). */
export function resolveRuntimes(kitRoot, explicit) {
  return parseRuntimes(explicit) ?? parseRuntimes(readConfig(kitRoot).runtimes) ?? ['opencode'];
}

/**
 * Matérialise le kit dans un projet : seeds -> .agents/, AGENTS.md, puis un adaptateur par runtime (.opencode/, .claude/).
 * Le cœur du workflow (core/) n'est pas copié : les textes le citent à <projet>/workflow-kit/core/.
 * Un fichier projet déjà présent n'est jamais écrasé (quarantaine .agents/doublons/), sauf onConflict='overwrite'.
 */
export function sync({ kitRoot, target, stack, projectName = '', date = today(), onConflict = 'quarantine', runtimes, quiet = false }) {
  const log = logger(quiet);
  kitRoot = path.resolve(kitRoot);
  target = path.resolve(target);
  stack = stack || readConfig(kitRoot).stack || 'laravel-livewire';
  runtimes = parseRuntimes(runtimes) ?? resolveRuntimes(kitRoot);

  const packDir = path.join(kitRoot, 'packs', stack);
  if (!exists(packDir)) throw new Error(`Pack introuvable : ${packDir}`);

  const opencodeDir = path.join(target, '.opencode');
  const agentsDir = path.join(target, '.agents');
  const doublonsRoot = path.join(agentsDir, 'doublons');
  const conflicts = [];
  const placed = [];

  function placeFile(source, destination) {
    let content = readUtf8(source);
    if (projectName) content = content.replaceAll('<Projet>', projectName);
    content = content.replaceAll('YYYY-MM-DD', date);

    if (exists(destination) && onConflict !== 'overwrite') {
      const r = rel(target, destination);
      writeUtf8(path.join(doublonsRoot, r), content);
      conflicts.push(r);
      return;
    }
    writeUtf8(destination, content);
    placed.push(destination);
  }

  function copyTree(sourceRoot, destRoot) {
    for (const f of walk(sourceRoot)) placeFile(f, path.join(destRoot, rel(sourceRoot, f)));
  }

  // 1. Seeds projet -> .agents/
  copyTree(path.join(packDir, 'agents'), agentsDir);
  log.info(`[pack:${stack}] agents/ -> .agents/`);
  copyTree(path.join(kitRoot, 'project', 'agents'), agentsDir);
  log.info('[project] agents/ -> .agents/');
  const agentsMd = path.join(kitRoot, 'project', 'AGENTS.md');
  if (exists(agentsMd)) {
    placeFile(agentsMd, path.join(target, 'AGENTS.md'));
    log.info('[project] AGENTS.md -> AGENTS.md');
  }

  // 2. Migration : anciens .opencode/ techno -> .agents/
  const moved = [];
  for (const [oldRel, newRel] of LEGACY) {
    const oldPath = path.join(opencodeDir, oldRel);
    if (!exists(oldPath)) continue;
    const newPath = path.join(agentsDir, newRel);
    if (exists(newPath)) move(newPath, path.join(doublonsRoot, '_seeds', newRel));
    move(oldPath, newPath);
    moved.push(oldRel);
  }
  if (moved.length) {
    log.info(`[migration] ${moved.length} chemin(s) .opencode/ migre(s) vers .agents/`);
    for (const m of [...new Set(moved)].sort()) log.info(`  ~ .opencode/${m} -> .agents/`);
  }

  // 3. Le cœur n'est plus monté : retirer l'ancien lien .workflow (version intermédiaire), sans suivre sa cible
  const coreDir = path.join(kitRoot, 'core');
  const staleLink = path.join(target, '.workflow');
  if (isLink(staleLink)) {
    removeLink(staleLink);
    log.info('[migration] ancien lien .workflow retire (le coeur est cite a workflow-kit/core/)');
  }
  if (path.resolve(kitRoot) !== path.join(target, 'workflow-kit')) {
    log.warn(`le kit n'est pas a ${path.join(target, 'workflow-kit')} : les chemins workflow-kit/core/... des textes seront morts`);
  }

  // 4. Adaptateurs : un par runtime, generes depuis core/
  const ctx = { kitRoot, target, coreDir, agentsDir, log };
  const ignore = ['workflow-kit/'];
  for (const r of runtimes) ignore.push(...(adapters[r].render(ctx)?.ignore ?? []));
  ensureGitignore(target, ignore, log);

  // 4bis. Fichiers du projet : anciens chemins (.opencode/, .workflow/) -> workflow-kit/core/ | .agents/
  migrateProjectRefs(target, log);

  // 5. Contrôle : jetons non résolus
  const leftover = [];
  for (const f of new Set(placed)) {
    if (!exists(f)) continue;
    for (const m of readUtf8(f).matchAll(TOKEN_RE)) leftover.push(`${f} : ${m[0]}`);
  }
  if (leftover.length) {
    log.warn('Jetons non resolus :');
    for (const l of [...new Set(leftover)].sort()) log.warn(`  ${l}`);
  } else {
    log.info('[ok] aucun jeton non resolu.');
  }

  // 6. Quarantaine : rapport
  if (conflicts.length) {
    const uniq = [...new Set(conflicts)].sort();
    const lines = [
      '# Doublons (fichiers projet deja presents, non ecrases)',
      '',
      "La version du kit a ete deposee ici AU LIEU D'ECRASER l'existante.",
      'Parcourez ce dossier, reportez manuellement ce qui est utile, puis supprimez-le.',
      '',
      ...uniq.map((c) => `- \`${c}\``),
    ];
    writeUtf8(path.join(doublonsRoot, 'README.md'), lines.join('\n') + '\n');
    log.warn(`${uniq.length} fichier(s) projet deja present(s) : quarantaine dans .agents/doublons/`);
  }

  log.info(`\nMaterialisation terminee.`);
  return { placed, conflicts, stack };
}
