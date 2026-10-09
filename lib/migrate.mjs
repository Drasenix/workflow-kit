import path from 'node:path';
import { exists, readUtf8, rel, walk, writeUtf8 } from './util.mjs';

/**
 * Anciens chemins cités dans les fichiers du PROJET (.agents/**.md, AGENTS.md) -> chemins actuels :
 *   `.opencode/...` (modèle d'origine) et `.workflow/...` (version intermédiaire) -> `workflow-kit/core/...`
 * Ordre significatif : les contenus techno déjà migrés vers .agents/ passent avant le core.
 * Idempotent. Seuls les chemins connus du kit sont réécrits (jamais un `.opencode/` quelconque).
 */
const CORE = 'workflow-kit/core/';
const RULES = [
  // contenus techno -> .agents/ (voir LEGACY dans sync.mjs)
  [/\.opencode\/doc\/reference-utilitaires\.md/g, '.agents/reference-utilitaires.md'],
  [/\.opencode\/doc\//g, '.agents/doc/'],
  [/\.opencode\/feature\//g, '.agents/feature/'],
  [/\.opencode\/skills\/(tests|recette|migrate-fresh)\b/g, '.agents/skills/$1'],
  [/\.opencode\/templates\/(backend|frontend|tests)\b/g, '.agents/templates/$1'],
  [/\.opencode\/templates-index\.md/g, '.agents/templates-index.md'],
  [/\.opencode\/agent-frontend\.md/g, '.agents/ui-rules.md'],
  [/\.opencode\/agent-livewire\.md/g, '.agents/component-rules.md'],
  // core -> workflow-kit/core/
  [/\.opencode\/agent-opencode\.md/g, `${CORE}agent-build.md`],
  [/\.opencode\/command\//g, `${CORE}commands/`],
  [/\.opencode\/(agent-workflow\.md|agent-build\.md|index\.md|templates\/feature\.md|agents\/|skills\/)/g, `${CORE}$1`],
  // version intermédiaire : lien .workflow
  [/\.workflow\//g, CORE],
];

export function migrateProjectRefs(target, log) {
  const files = [path.join(target, 'AGENTS.md'), ...walk(path.join(target, '.agents'), (n) => n === 'doublons' || n === 'node_modules')].filter(
    (f) => f.endsWith('.md') && exists(f),
  );
  const touched = [];
  for (const f of files) {
    const before = readUtf8(f);
    let after = before;
    for (const [re, to] of RULES) after = after.replace(re, to);
    if (after !== before) {
      writeUtf8(f, after);
      touched.push(rel(target, f));
    }
  }
  if (touched.length) {
    log.info(`[migration] anciens chemins (.opencode/, .workflow/) -> workflow-kit/core/ | .agents/ reecrits dans ${touched.length} fichier(s) :`);
    for (const t of touched) log.info(`  ~ ${t}`);
  }
  return touched;
}
