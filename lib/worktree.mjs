import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { exists, isLink, readUtf8, writeUtf8 } from './util.mjs';

/** Dossiers du checkout principal à lier dans un worktree : le kit (dépôt imbriqué) et les fichiers générés pour opencode. */
const LINKED = ['workflow-kit', '.opencode'];
/** Dossiers de .claude/ où le kit génère des fichiers ignorés par git, à copier s'ils manquent. */
const CLAUDE_GENERATED = ['.claude/agents', '.claude/skills', '.claude/commands'];

const git = (cwd, ...args) => execFileSync('git', ['-C', cwd, ...args], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
const same = (a, b) => path.resolve(a).toLowerCase() === path.resolve(b).toLowerCase();

/**
 * `worktree` : prépare un worktree git pour le workflow, quel que soit l'outil qui l'a créé (opencode, `git worktree add`,
 * Claude Code). Le kit et les fichiers générés sont ignorés par git : un worktree ne les reçoit pas.
 * - `workflow-kit` et `.opencode` : liens vers ceux du checkout principal (jonction sous Windows, sans droit particulier ;
 *   lien symbolique ailleurs) ;
 * - `.claude/{agents,skills,commands}` : copie des fichiers générés absents ;
 * - `info/exclude` du dépôt (partagé par tous les worktrees) : les liens y sont ignorés, même si le .gitignore
 *   de la branche ne les couvre pas (un lien est un fichier pour git).
 * Idempotent ; sans effet dans le checkout principal. Code 1 si le dossier n'est pas un dépôt git ou si le kit manque.
 */
export function prepareWorktree({ target = process.cwd(), log = console } = {}) {
  let root;
  let commonDir;
  try {
    root = git(target, 'rev-parse', '--show-toplevel');
    commonDir = git(target, 'rev-parse', '--path-format=absolute', '--git-common-dir');
  } catch {
    log.error(`[KO] ${target} n'est pas dans un dépôt git`);
    return 1;
  }
  const main = path.dirname(commonDir);
  if (same(root, main)) {
    log.log(`[ok] ${root} est le checkout principal : rien à préparer`);
    return 0;
  }
  if (!exists(path.join(main, 'workflow-kit', 'core', 'index.md'))) {
    log.error(`[KO] kit absent du checkout principal (${path.join(main, 'workflow-kit')}) : rien à lier`);
    return 1;
  }

  const done = [];
  const excludeFile = path.join(commonDir, 'info', 'exclude');
  const excluded = new Set((exists(excludeFile) ? readUtf8(excludeFile) : '').split(/\r?\n/).map((l) => l.trim()));
  const missingExcludes = LINKED.filter((n) => !excluded.has(n));
  if (missingExcludes.length) {
    const current = exists(excludeFile) ? readUtf8(excludeFile) : '';
    writeUtf8(excludeFile, `${current}${current && !current.endsWith('\n') ? '\n' : ''}# workflow-kit : liens des worktrees\n${missingExcludes.join('\n')}\n`);
    done.push(`info/exclude : ${missingExcludes.join(', ')}`);
  }

  for (const name of LINKED) {
    const src = path.join(main, name);
    const dst = path.join(root, name);
    if (!exists(src) || exists(dst) || isLink(dst)) continue;
    fs.symlinkSync(src, dst, process.platform === 'win32' ? 'junction' : 'dir');
    done.push(`lien ${name} -> ${src}`);
  }

  let copied = 0;
  const generated = git(main, 'ls-files', '--others', '--ignored', '--exclude-standard', '--', ...CLAUDE_GENERATED);
  for (const file of generated.split('\n').filter(Boolean)) {
    const dst = path.join(root, file);
    if (exists(dst)) continue;
    fs.mkdirSync(path.dirname(dst), { recursive: true });
    fs.copyFileSync(path.join(main, file), dst);
    copied++;
  }
  if (copied) done.push(`${copied} fichier(s) généré(s) copié(s) dans .claude/`);

  log.log(done.length ? `[ok] worktree prêt (${root}) :\n${done.map((d) => `  - ${d}`).join('\n')}` : `[ok] worktree déjà prêt (${root})`);
  return 0;
}
