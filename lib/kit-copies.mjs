import path from 'node:path';
import { exists, readUtf8 } from './util.mjs';

/**
 * Copies tenues par le kit : scripts autonomes que les projets n'adaptent pas, commités dans le projet pour qui
 * n'a pas le kit (collaborateur, session cloud). La synchronisation les écrase toujours (jamais de quarantaine),
 * et `check-meta` signale une copie différente de sa source.
 */
const COPIES = [
  ['lib/verifier-spec.mjs', '.agents/specs/verifier-spec.mjs'],
  ['core/specs/ecrire-une-regle.md', '.agents/specs/ecrire-une-regle.md'],
  ['packs/{stack}/agents/skills/tests/assets/verifier-tests-gardes.py', '.agents/skills/tests/assets/verifier-tests-gardes.py'],
];

/** Copies applicables au pack : `{ source, dest }`, `dest` relatif au projet (séparateur `/`). */
export function kitCopies(kitRoot, stack) {
  return COPIES.map(([s, d]) => ({ source: path.join(kitRoot, s.replace('{stack}', stack)), dest: d })).filter((c) => exists(c.source));
}

/** Copies absentes ou différentes de leur source dans le projet `root`. */
export function staleKitCopies(kitRoot, stack, root) {
  const problems = [];
  for (const c of kitCopies(kitRoot, stack)) {
    const dest = path.join(root, c.dest);
    if (!exists(dest)) problems.push(`\`${c.dest}\` absente : relancer \`workflow-kit sync\``);
    else if (readUtf8(dest) !== readUtf8(c.source)) problems.push(`\`${c.dest}\` périmée (différente du kit) : relancer \`workflow-kit sync\`, sans la modifier à la main`);
  }
  return problems;
}
