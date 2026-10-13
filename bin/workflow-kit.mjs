#!/usr/bin/env node
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';
import { checkCompaction, compactFeature } from '../lib/compact.mjs';
import { init } from '../lib/init.mjs';
import { resolveRuntimes, sync } from '../lib/sync.mjs';
import { verify } from '../lib/verify.mjs';

const kitRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const HELP = `workflow-kit <commande> [options]

  init     Installe le kit dans un projet (clone imbrique, seeds, adaptateurs)
  sync     Rematerialise les seeds et les adaptateurs .opencode/ .claude/ (apres un pull du kit)
  verify   Audit du kit (agnosticisme, packs, references, round-trip)
  compact <fichier>  Squelette compacte d'un fichier de feature clos (skill compacter-feature)
                     --check : controle le resultat ; --dry-run : decrit sans ecrire

Options communes
  --target <dir>        Projet cible (defaut : cwd)
  --stack <pack>        Pack techno (defaut : workflow.config.json)
  --name <nom>          Nom du projet (remplace <Projet>)
  --runtime <r>         opencode | claude | both (defaut : workflow.config.json, sinon opencode)
  --on-conflict <mode>  quarantine (defaut) | overwrite
  --force               Ecrase les fichiers projet (+ remplace le kit imbrique pour init)
init   : --kit-repo <url>
`;

const { values, positionals } = parseArgs({
  allowPositionals: true,
  options: {
    target: { type: 'string' },
    stack: { type: 'string' },
    name: { type: 'string' },
    'kit-repo': { type: 'string' },
    runtime: { type: 'string' },
    'on-conflict': { type: 'string' },
    force: { type: 'boolean', default: false },
    check: { type: 'boolean', default: false },
    'dry-run': { type: 'boolean', default: false },
    help: { type: 'boolean', short: 'h', default: false },
  },
});

const [command] = positionals;
const onConflict = values.force ? 'overwrite' : values['on-conflict'];

try {
  if (values.help || !command) {
    console.log(HELP);
  } else if (command === 'init') {
    await init({ kitRoot, target: values.target, stack: values.stack, name: values.name, kitRepo: values['kit-repo'], runtime: values.runtime, onConflict, force: values.force });
  } else if (command === 'sync') {
    sync({ kitRoot, target: values.target || process.cwd(), stack: values.stack, projectName: values.name, onConflict, runtimes: resolveRuntimes(kitRoot, values.runtime) });
  } else if (command === 'verify') {
    process.exitCode = verify({ kitRoot }) === 0 ? 0 : 1;
  } else if (command === 'compact') {
    const file = positionals[1];
    if (!file) throw new Error('compact : fichier manquant (ex. compact .agents/feature/DONE-x.md)');
    process.exitCode = values.check ? checkCompaction({ file }) : compactFeature({ file, dryRun: values['dry-run'] });
  } else {
    console.error(`Commande inconnue : ${command}\n\n${HELP}`);
    process.exitCode = 2;
  }
} catch (e) {
  console.error(`Erreur : ${e.message}`);
  process.exitCode = 1;
}
