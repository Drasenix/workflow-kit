import { execFileSync, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const PREFIX = 'recette/';

const git = (cwd, ...args) => execFileSync('git', ['-C', cwd, ...args], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
const tryGit = (cwd, ...args) => {
  try {
    return git(cwd, ...args);
  } catch {
    return null;
  }
};
const norm = (p) => path.resolve(p).toLowerCase();
const isInside = (child, parent) => {
  const r = path.relative(norm(parent), norm(child));
  return r === '' || (!r.startsWith('..') && !path.isAbsolute(r));
};

/** Worktrees du dépôt (`git worktree list --porcelain`) : chemin et branche (`refs/heads/…`, absente si HEAD détaché). */
function worktrees(main) {
  const list = [];
  for (const block of git(main, 'worktree', 'list', '--porcelain').split(/\n\s*\n/)) {
    const wt = {};
    for (const line of block.split('\n')) {
      if (line.startsWith('worktree ')) wt.path = line.slice('worktree '.length);
      if (line.startsWith('branch ')) wt.branch = line.slice('branch '.length);
    }
    if (wt.path) list.push(wt);
  }
  return list;
}

/**
 * Fichiers d'un autre propriétaire dans le worktree (POSIX), typiquement créés par un conteneur sous root :
 * `git worktree remove` échouerait sur eux. Les liens ne sont pas suivis (le kit et `.opencode` sont des liens
 * vers le checkout principal). Un dossier illisible compte comme étranger.
 */
function foreignFiles(root, uid, max = 5) {
  const found = [];
  let total = 0;
  const visit = (dir) => {
    let entries;
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch {
      total++;
      if (found.length < max) found.push(dir);
      return;
    }
    for (const e of entries) {
      const full = path.join(dir, e.name);
      let st;
      try {
        st = fs.lstatSync(full);
      } catch {
        continue;
      }
      if (st.uid !== uid) {
        total++;
        if (found.length < max) found.push(full);
      }
      if (e.isDirectory() && !e.isSymbolicLink()) visit(full);
    }
  };
  visit(root);
  return { found, total };
}

/**
 * `cloturer-recette <feature|recette/feature>` : clôture une branche de recette, jetable par nature.
 * 1. contrôles : branche `recette/…`, ni extraite dans le checkout principal ni lancée depuis son worktree,
 *    worktree propre, commits poussés (sinon arrêt ; `force` passe outre aux deux derniers) ;
 * 2. démontage de l'environnement du worktree : commande du projet (`teardown`), lancée dans le worktree ;
 * 3. arrêt si des fichiers d'un autre propriétaire restent (la commande du projet doit les rendre) ;
 * 4. retrait du worktree (`git worktree remove`, puis `prune`) ;
 * 5. suppression de la branche locale, puis de la branche distante.
 * `dryRun` décrit sans rien faire. Code 0 si tout est fait (ou décrit), 1 sinon. Rien hors du dépôt n'est touché.
 */
export function cloturerRecette({ target = process.cwd(), branche, teardown, remote = 'origin', dryRun = false, force = false, log = console } = {}) {
  if (!branche) {
    log.error('[KO] branche de recette manquante (ex. cloturer-recette ma-feature, ou recette/ma-feature)');
    return 1;
  }
  const branch = branche.startsWith(PREFIX) ? branche : `${PREFIX}${branche}`;
  if (branch.slice(PREFIX.length).length === 0) {
    log.error(`[KO] nom de branche incomplet : ${branch}`);
    return 1;
  }

  let main;
  try {
    main = path.dirname(git(target, 'rev-parse', '--path-format=absolute', '--git-common-dir'));
  } catch {
    log.error(`[KO] ${target} n'est pas dans un dépôt git`);
    return 1;
  }

  const wt = worktrees(main).find((w) => w.branch === `refs/heads/${branch}`);
  if (wt && norm(wt.path) === norm(main)) {
    log.error(`[KO] ${branch} est extraite dans le checkout principal : passer sur une autre branche d'abord`);
    return 1;
  }
  if (wt && isInside(target, wt.path)) {
    log.error(`[KO] lancé depuis le worktree à retirer (${wt.path}) : relancer depuis le checkout principal`);
    return 1;
  }

  const local = tryGit(main, 'rev-parse', '--verify', '--quiet', `refs/heads/${branch}`);
  const hasRemote = tryGit(main, 'remote', 'get-url', remote) !== null;
  const remoteHead = hasRemote ? (tryGit(main, 'ls-remote', '--heads', remote, `refs/heads/${branch}`) || '').split(/\s+/)[0] || null : null;
  if (!local && !wt && !remoteHead) {
    log.error(`[KO] ${branch} introuvable (ni branche locale, ni worktree, ni branche sur ${hasRemote ? remote : 'un dépôt distant'})`);
    return 1;
  }

  const blockers = [];
  if (wt) {
    const dirty = git(wt.path, 'status', '--porcelain').split('\n').filter(Boolean);
    if (dirty.length) blockers.push(`worktree non propre (${dirty.length} fichier(s), ex. ${dirty[0].slice(3)}) : committer et pousser, ou abandonner ces changements`);
  }
  if (local) {
    if (!remoteHead) {
      blockers.push(`${branch} n'a jamais été poussée sur ${remote} : ses commits disparaîtraient`);
    } else {
      tryGit(main, 'fetch', '--quiet', remote, `refs/heads/${branch}`);
      const pushed = tryGit(main, 'merge-base', '--is-ancestor', local, remoteHead) !== null;
      if (!pushed) blockers.push(`${branch} a des commits non poussés sur ${remote} : les pousser d'abord`);
    }
  }
  if (blockers.length && !force) {
    log.error(`[KO] clôture arrêtée, rien n'a été supprimé :\n${blockers.map((b) => `  - ${b}`).join('\n')}\n  (--force passe outre et perd ces changements)`);
    return 1;
  }

  const plan = [];
  if (wt && teardown) plan.push(`démonter l'environnement du worktree : ${teardown}`);
  if (wt) plan.push(`retirer le worktree ${wt.path}`);
  if (local) plan.push(`supprimer la branche locale ${branch}`);
  if (remoteHead) plan.push(`supprimer la branche ${branch} sur ${remote}`);
  if (dryRun) {
    log.log(`[ok] clôture de ${branch} (simulation, rien n'est fait) :\n${plan.map((p) => `  - ${p}`).join('\n')}${blockers.length ? `\n  forcée malgré :\n${blockers.map((b) => `    - ${b}`).join('\n')}` : ''}`);
    return 0;
  }

  const done = [];
  if (wt && teardown) {
    log.log(`[..] démontage : ${teardown}`);
    const r = spawnSync(teardown, { cwd: wt.path, shell: true, stdio: 'inherit' });
    if (r.status !== 0) {
      log.error(`[KO] le démontage a échoué (code ${r.status ?? r.signal}) : worktree et branche laissés en place`);
      return 1;
    }
    done.push(`environnement démonté (${teardown})`);
  }

  if (wt) {
    if (typeof process.getuid === 'function') {
      const { found, total } = foreignFiles(wt.path, process.getuid());
      if (total) {
        log.error(`[KO] ${total} fichier(s) d'un autre propriétaire dans ${wt.path} (créés par un conteneur ?), ex. :\n${found.map((f) => `  - ${f}`).join('\n')}\n  La commande de démontage du projet doit les rendre à l'utilisateur. Worktree et branche laissés en place.`);
        if (done.length) log.log(`  déjà fait : ${done.join(' ; ')}`);
        return 1;
      }
    }
    try {
      git(main, 'worktree', 'remove', wt.path);
    } catch (e) {
      log.error(`[KO] retrait du worktree impossible : ${(e.stderr || e.message || '').toString().trim()}`);
      return 1;
    }
    done.push(`worktree retiré (${wt.path})`);
  }
  tryGit(main, 'worktree', 'prune');

  if (local) {
    git(main, 'branch', '-D', branch);
    done.push(`branche locale ${branch} supprimée`);
  }
  if (remoteHead) {
    try {
      git(main, 'push', '--quiet', remote, '--delete', branch);
      done.push(`branche ${branch} supprimée sur ${remote}`);
    } catch (e) {
      log.error(`[KO] suppression de ${branch} sur ${remote} impossible : ${(e.stderr || e.message || '').toString().trim()}`);
      log.log(`  déjà fait : ${done.join(' ; ')}`);
      return 1;
    }
  }

  log.log(`[ok] recette ${branch} clôturée :\n${done.map((d) => `  - ${d}`).join('\n')}`);
  return 0;
}
