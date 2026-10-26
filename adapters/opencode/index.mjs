import fs from 'node:fs';
import path from 'node:path';
import { parseAgent, RETIRED_AGENTS } from '../../lib/frontmatter.mjs';
import { exists, isLink, move, readUtf8, remove, removeLink, rel, walk, writeUtf8 } from '../../lib/util.mjs';

export const id = 'opencode';

/** Copies de core/ déposées autrefois à la racine de .opencode/ (mode copie) : le cœur est désormais lu à workflow-kit/core/. */
const STALE_CORE = ['index.md', 'agent-workflow.md', 'agent-opencode.md', 'templates/feature.md'];

function renderAgent(text) {
  const a = parseAgent(text);
  const perms = a.tools.map(([action, effect]) => `  - action: ${action}\n    resource: "*"\n    effect: ${effect}\n`).join('');
  return `---\ndescription: ${a.description}\nmode: ${a.mode}\npermissions:\n${perms}---\n${a.body}`;
}

function copyDir(src, dest) {
  for (const f of walk(src, (n) => n === 'node_modules')) writeUtf8(path.join(dest, rel(src, f)), readUtf8(f));
}

function mergeOpencodeJson({ kitRoot, target, log }) {
  const fragment = JSON.parse(readUtf8(path.join(kitRoot, 'adapters/opencode/opencode.agent.json')));
  const p = path.join(target, 'opencode.json');
  const cfg = exists(p) ? JSON.parse(readUtf8(p)) : { $schema: 'https://opencode.ai/config.json' };

  // Un agent principal par entrée du fragment (build, raffineur) : ses subagents autorisés via Task ; un agent retiré du kit perd son autorisation.
  cfg.agent ??= {};
  for (const [name, def] of Object.entries(fragment.agent)) {
    cfg.agent[name] ??= {};
    cfg.agent[name].permission ??= {};
    cfg.agent[name].permission.task ??= {};
    const task = cfg.agent[name].permission.task;
    for (const retired of RETIRED_AGENTS) delete task[retired];
    Object.assign(task, def.permission.task);
  }

  const instr = '.agents/workflow-commands.md';
  cfg.instructions = [].concat(cfg.instructions ?? []);
  if (!cfg.instructions.includes(instr)) cfg.instructions.push(instr);

  writeUtf8(p, JSON.stringify(cfg, null, 2) + '\n');
  log.info('[opencode.json] permissions subagents + instructions fusionnees');
}

/** Prépare .opencode/ : un ancien lien vers core est retiré (jamais écrit à travers), le contenu projet est migré. */
function prepare({ target, agentsDir, log }) {
  const dir = path.join(target, '.opencode');
  if (isLink(dir)) {
    removeLink(dir);
    log.info('[opencode] ancien lien .opencode -> core retire (remplace par un dossier genere)');
    return dir;
  }
  if (!exists(dir)) return dir;

  const featOld = path.join(dir, 'feature');
  if (exists(featOld) && !exists(path.join(agentsDir, 'feature'))) {
    move(featOld, path.join(agentsDir, 'feature'));
    log.info('[migration] .opencode/feature -> .agents/feature');
  }
  const docOld = path.join(dir, 'doc');
  if (exists(docOld)) {
    const docNew = path.join(agentsDir, 'doc');
    fs.mkdirSync(docNew, { recursive: true });
    for (const name of fs.readdirSync(docOld)) {
      const t = path.join(docNew, name);
      if (!exists(t)) move(path.join(docOld, name), t);
    }
    log.info('[migration] .opencode/doc -> .agents/doc');
  }
  for (const f of STALE_CORE) remove(path.join(dir, f));
  return dir;
}

/** core/ (neutre) -> .opencode/{agents,command,skills} + opencode.json. */
export function render(ctx) {
  const { coreDir, log } = ctx;
  const dir = prepare(ctx);

  for (const f of walk(path.join(coreDir, 'agents'))) {
    writeUtf8(path.join(dir, 'agents', rel(path.join(coreDir, 'agents'), f)), renderAgent(readUtf8(f)));
  }
  for (const retired of RETIRED_AGENTS) {
    const stale = path.join(dir, 'agents', `${retired}.md`);
    if (exists(stale)) {
      remove(stale);
      log.info(`[opencode] agent retire du kit supprime : agents/${retired}.md`);
    }
  }
  copyDir(path.join(coreDir, 'commands'), path.join(dir, 'command'));
  copyDir(path.join(coreDir, 'skills'), path.join(dir, 'skills'));
  log.info('[opencode] agents/, command/, skills/ -> .opencode/ [genere]');

  mergeOpencodeJson(ctx);
  return { ignore: ['.opencode'] };
}
