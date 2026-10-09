import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { exists, prompt, readUtf8, remove, writeUtf8 } from './util.mjs';
import { sync } from './sync.mjs';
import { RUNTIMES, parseRuntimes } from './adapters.mjs';

const git = (args, opts = {}) => execFileSync('git', args, { stdio: 'pipe', encoding: 'utf8', ...opts });

function placeKit({ kitRoot, projectKit, kitRepo, force }) {
  if (exists(projectKit)) {
    if (force) remove(projectKit);
    else return console.log('[kit] workflow-kit/ existe deja : reutilise');
  }
  if (kitRepo) {
    console.log(`[kit] git clone ${kitRepo} -> workflow-kit/`);
    try {
      git(['clone', '--quiet', kitRepo, projectKit]);
    } catch {
      throw new Error(`git clone a echoue : ${kitRepo}`);
    }
    // HEAD distant invalide (branche par defaut absente) -> checkout explicite main/master.
    if (!exists(path.join(projectKit, 'core'))) {
      const brs = git(['-C', projectKit, 'branch', '-r'])
        .split('\n')
        .map((l) => l.trim().replace(/.*origin\//, ''))
        .filter((b) => b && !b.includes('HEAD'));
      const br = brs.includes('main') ? 'main' : brs.includes('master') ? 'master' : brs[0];
      if (br) git(['-C', projectKit, 'checkout', '--quiet', br]);
      console.log(`[kit] checkout branche '${br}'`);
    }
  } else {
    console.log('[kit] copie locale -> workflow-kit/ (pas de .git : renseigner --kit-repo pour un clone)');
    const skip = new Set(['.git', 'node_modules', 'workflow-kit']);
    fs.cpSync(kitRoot, projectKit, { recursive: true, filter: (src) => src === kitRoot || !skip.has(path.basename(src)) });
  }
}

export async function init(opts) {
  const kitRoot = path.resolve(opts.kitRoot);
  const force = !!opts.force;
  const onConflict = force ? 'overwrite' : opts.onConflict || 'quarantine';

  let target = opts.target || (await prompt('Dossier projet cible', process.cwd()));
  target = path.resolve(target);
  fs.mkdirSync(target, { recursive: true });

  const stacks = fs.readdirSync(path.join(kitRoot, 'packs'), { withFileTypes: true }).filter((d) => d.isDirectory()).map((d) => d.name);
  let stack = opts.stack;
  if (!stack) {
    console.log(`Packs disponibles : ${stacks.join(', ')}`);
    stack = await prompt('Pack techno', 'laravel-livewire');
  }
  if (!stacks.includes(stack)) throw new Error(`Pack introuvable : '${stack}'. Disponibles : ${stacks.join(', ')}`);
  const name = opts.name || (await prompt('Nom du projet', path.basename(target)));
  const runtimes = parseRuntimes(opts.runtime || (await prompt(`Runtime (${RUNTIMES.join(' | ')} | both)`, 'both')));

  console.log(`\nProjet  : ${target}\nNom     : ${name}\nStack   : ${stack}\nRuntime : ${runtimes.join(', ')}\nKitRepo : ${opts.kitRepo || '(copie locale)'}\nConflit : ${onConflict}\n`);

  // 2. Kit en depot imbrique
  const projectKit = path.join(target, 'workflow-kit');
  placeKit({ kitRoot, projectKit, kitRepo: opts.kitRepo, force });

  // config du kit : stack + runtimes choisis
  const cfgPath = path.join(projectKit, 'workflow.config.json');
  const cfg = exists(cfgPath) ? JSON.parse(readUtf8(cfgPath)) : {};
  writeUtf8(cfgPath, JSON.stringify({ ...cfg, stack, runtimes }, null, 2) + '\n');

  // 3. Materialisation : toujours depuis le kit imbrique. Gere aussi le .gitignore.
  sync({ kitRoot: projectKit, target, stack, projectName: name, onConflict, runtimes });

  // 4. Retirer .opencode/ de l'index git (si deja suivi)
  if (exists(path.join(target, '.git'))) {
    try {
      git(['-C', target, 'rm', '-r', '--cached', '--ignore-unmatch', '--quiet', '.opencode']);
      console.log("[git] .opencode/ retire de l'index (fichiers conserves sur disque)");
    } catch {
      /* pas bloquant */
    }
  }

  // 5. Dossier feature (non destructif)
  const keep = path.join(target, '.agents/feature/.gitkeep');
  if (!exists(keep)) writeUtf8(keep, '');
  console.log('[feature] dossier cree : .agents/feature/');

  console.log('\nInstallation terminee.\n');
  console.log('A faire manuellement :');
  console.log('  - Remplir le glossaire (.agents/domain-glossary.md).');
  console.log('  - Deposer les specs officielles dans .agents/specs/spec.txt.');
  console.log('  - Remplir conventions / architecture / stack / commands (.agents/).');
  if (stack === '_blank') console.log("  - Pack '_blank' : completer les fichiers de .agents/.");
  console.log("  - Le coeur du workflow vit dans workflow-kit/core/ (git -C workflow-kit pour commit/push) ; apres un changement d'agent, de skill ou de commande : `node workflow-kit/bin/workflow-kit.mjs sync` regenere .opencode/ et .claude/.");
}
