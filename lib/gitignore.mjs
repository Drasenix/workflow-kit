import path from 'node:path';
import { exists, readUtf8, writeUtf8 } from './util.mjs';

const HEADER = '# workflow-kit (kit agnostique imbrique + fichiers generes, non commites)';

/**
 * Ajoute au .gitignore du projet les motifs manquants (jamais de retrait).
 * Un motif se termine par `/` s'il ne désigne qu'un dossier ; sans `/` il couvre aussi un lien (symlink = fichier pour git).
 * Un motif `x/` est considéré présent si `x` l'est aussi. `x` exige la ligne exacte.
 */
export function ensureGitignore(target, patterns, log) {
  const p = path.join(target, '.gitignore');
  let gi = exists(p) ? readUtf8(p) : '';
  const lines = new Set(gi.split(/\r?\n/).map((l) => l.trim()));
  const missing = [...new Set(patterns)].filter((pat) => !lines.has(pat) && !(pat.endsWith('/') && lines.has(pat.slice(0, -1))));
  if (!missing.length) return;

  if (gi && !gi.endsWith('\n')) gi += '\n';
  if (!lines.has(HEADER) && ![...lines].some((l) => l.startsWith('# workflow-kit'))) gi += `${HEADER}\n`;
  gi += missing.join('\n') + '\n';
  writeUtf8(p, gi);
  log.info(`[gitignore] ${missing.join(', ')}`);
}
