import fs from 'node:fs';
import path from 'node:path';
import { parseAgent } from '../../lib/frontmatter.mjs';
import { exists, readUtf8, rel, walk, writeUtf8 } from '../../lib/util.mjs';

export const id = 'claude';

// action neutre -> outils Claude Code
const TOOLS = { read: ['Read'], edit: ['Edit', 'Write'], shell: ['Bash'], glob: ['Glob'], grep: ['Grep'], webfetch: ['WebFetch'] };

const START = '<!-- workflow-kit:start (genere par workflow-kit, ne pas editer ce bloc) -->';
const END = '<!-- workflow-kit:end -->';
const BLOCK = `${START}
## Workflow de dev (workflow-kit)

@AGENTS.md
@.agents/workflow-commands.md

Pour travailler sur une feature : « consulte le workflow » (skill \`consult-workflow\`, regles dans \`workflow-kit/core/\`).

Commits : jamais de ligne \`Co-Authored-By\`.
${END}`;

/** Une action absente de la source = autorisée (défaut opencode), pour garder la même sémantique des deux côtés. */
function renderAgent(text) {
  const a = parseAgent(text);
  const effect = new Map(a.tools);
  const tools = Object.keys(TOOLS)
    .filter((action) => effect.get(action) !== 'deny')
    .flatMap((action) => TOOLS[action]);
  // description en JSON : un scalaire YAML non quoté casse sur « : »
  return `---\nname: ${a.name}\ndescription: ${JSON.stringify(a.description)}\ntools: ${tools.join(', ')}\n---\n${a.body}`;
}

/** Insère ou met à jour le bloc géré de CLAUDE.md ; le reste du fichier n'est jamais touché. */
function ensureClaudeMd({ target, log }) {
  const p = path.join(target, 'CLAUDE.md');
  if (fs.existsSync(p) && fs.lstatSync(p).isSymbolicLink()) {
    log.warn('CLAUDE.md est un lien (vers AGENTS.md ?) : bloc workflow-kit non ajoute, ajouter a la main : @.agents/workflow-commands.md');
    return;
  }
  const current = exists(p) ? readUtf8(p) : '';
  const re = new RegExp(`${START.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}[\\s\\S]*?${END}`);
  let next;
  if (re.test(current)) next = current.replace(re, () => BLOCK);
  else next = current ? `${current.replace(/\s*$/, '')}\n\n${BLOCK}\n` : `${BLOCK}\n`;
  if (next !== current) {
    writeUtf8(p, next);
    log.info('[claude] CLAUDE.md : bloc workflow-kit a jour');
  }
}

/**
 * Fusionne dans .claude/settings.json la seule clé `attribution.commit` : vide = aucun trailer `Co-Authored-By` dans les commits.
 * Le reste du fichier n'est jamais touché ; un JSON invalide est signalé et laissé tel quel.
 * `attribution: false` (tout masqué) est respecté, mais jamais écrit par le kit : avant Claude Code 2.1.281, il fait ignorer tout le fichier.
 */
function ensureSettings({ target, log }) {
  const p = path.join(target, '.claude', 'settings.json');
  let cfg = {};
  if (exists(p)) {
    try {
      cfg = JSON.parse(readUtf8(p).replace(/^﻿/, ''));
    } catch {
      cfg = null;
    }
    if (!cfg || typeof cfg !== 'object' || Array.isArray(cfg)) {
      log.warn('[claude] .claude/settings.json invalide : attribution des commits non desactivee (corriger le JSON puis relancer sync)');
      return;
    }
  }
  if (cfg.attribution === false || cfg.attribution?.commit === '') return;
  const current = cfg.attribution && typeof cfg.attribution === 'object' ? cfg.attribution : {};
  cfg.attribution = { ...current, commit: '' };
  writeUtf8(p, JSON.stringify(cfg, null, 2) + '\n');
  log.info('[claude] .claude/settings.json : attribution des commits desactivee');
}

/**
 * Motifs .gitignore d'un dossier généré (.claude/<dir>) :
 * - dossier sans contenu étranger : `.claude/<dir>/*` (pas `<dir>/` : l'exception `!.claude/<dir>/ma-skill/` reste possible) ;
 * - dossier où le projet a déjà ses propres agents / skills / commandes (ex. skills Laravel Boost, suivies par git) :
 *   uniquement NOS fichiers, un par un, pour ne pas ignorer le contenu du projet ni ses futurs ajouts.
 * `generated` : noms (fichiers ou dossiers) que le kit écrit dans ce dossier.
 */
function ignoreFor(claudeDir, dir, generated, suffix = '') {
  if (!generated.length) return [];
  const present = exists(path.join(claudeDir, dir)) ? fs.readdirSync(path.join(claudeDir, dir)) : [];
  const foreign = present.filter((n) => !generated.includes(n));
  return foreign.length ? generated.map((n) => `.claude/${dir}/${n}${suffix}`) : [`.claude/${dir}/*`];
}

/**
 * core/ (neutre) -> .claude/{agents,skills,commands} + bloc CLAUDE.md + `attribution.commit` de .claude/settings.json.
 * Retourne les motifs à ignorer (voir `ignoreFor`). Le reste de .claude/ (settings.json…) n'est jamais ignoré.
 */
export function render(ctx) {
  const { coreDir, target, log } = ctx;
  const claudeDir = path.join(target, '.claude');

  const agentFiles = [];
  for (const f of walk(path.join(coreDir, 'agents'))) {
    const r = rel(path.join(coreDir, 'agents'), f);
    writeUtf8(path.join(claudeDir, 'agents', r), renderAgent(readUtf8(f)));
    agentFiles.push(r);
  }

  const skillsDir = path.join(coreDir, 'skills');
  const skillNames = exists(skillsDir) ? fs.readdirSync(skillsDir, { withFileTypes: true }).filter((d) => d.isDirectory()).map((d) => d.name) : [];
  for (const name of skillNames) {
    for (const f of walk(path.join(skillsDir, name))) writeUtf8(path.join(claudeDir, 'skills', name, rel(path.join(skillsDir, name), f)), readUtf8(f));
  }

  // Sous Claude Code une skill est déjà invocable en /<nom> : une commande du même nom la masquerait.
  const skipped = [];
  const commandFiles = [];
  const commandsDir = path.join(coreDir, 'commands');
  for (const f of walk(commandsDir)) {
    const name = path.basename(f, '.md');
    if (skillNames.includes(name)) {
      skipped.push(name);
      continue;
    }
    const r = rel(commandsDir, f);
    writeUtf8(path.join(claudeDir, 'commands', r), readUtf8(f));
    commandFiles.push(r);
  }
  log.info(`[claude] agents/, skills/${skipped.length ? '' : ', commands/'} -> .claude/ [genere]${skipped.length ? ` (commandes ${skipped.join(', ')} = skills du meme nom, non dupliquees)` : ''}`);

  ensureClaudeMd(ctx);
  ensureSettings(ctx);
  return {
    ignore: [
      ...ignoreFor(claudeDir, 'agents', agentFiles),
      ...ignoreFor(claudeDir, 'skills', skillNames, '/'),
      ...ignoreFor(claudeDir, 'commands', commandFiles),
    ],
  };
}
