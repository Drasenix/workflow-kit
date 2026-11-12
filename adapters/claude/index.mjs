import fs from 'node:fs';
import path from 'node:path';
import { parseAgent, RETIRED_AGENTS } from '../../lib/frontmatter.mjs';
import { exists, readUtf8, rel, remove, walk, writeUtf8 } from '../../lib/util.mjs';

export const id = 'claude';

// action neutre -> outils Claude Code
const TOOLS = { read: ['Read'], edit: ['Edit', 'Write'], shell: ['Bash'], glob: ['Glob'], grep: ['Grep'], webfetch: ['WebFetch', 'WebSearch'], task: ['Agent'] };

const START = '<!-- workflow-kit:start (genere par workflow-kit, ne pas editer ce bloc) -->';
const END = '<!-- workflow-kit:end -->';
const BLOCK = `${START}
## Workflow de dev (workflow-kit)

@AGENTS.md
@.agents/workflow-commands.md

Pour travailler sur une feature, une session par phase : \`/raffiner [feature]\` (raffinement), puis \`/realiser [feature]\` dans une nouvelle session (realisation). « consulte le workflow » dit ou en est une feature (regles dans \`workflow-kit/core/\`).

Commits : jamais de ligne \`Co-Authored-By\`.
${END}`;

/**
 * Une action absente de la source = autorisée (défaut opencode), pour garder la même sémantique des deux côtés.
 * Exception : `task` (délégation) n'est accordée que si la source l'autorise explicitement (agent principal).
 * `mode` n'a pas d'équivalent : un agent principal se lance comme session (`claude --agent <nom>`).
 */
function renderAgent(text) {
  const a = parseAgent(text);
  const effect = new Map(a.tools);
  const tools = Object.keys(TOOLS)
    .filter((action) => (action === 'task' ? effect.get(action) === 'allow' : effect.get(action) !== 'deny'))
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
 * Fusionne dans .claude/settings.json deux clés, et rien d'autre :
 * - `attribution.commit` vide : aucun trailer `Co-Authored-By` dans les commits ;
 * - `worktree.symlinkDirectories` contient `workflow-kit` : un worktree créé par Claude Code reçoit un lien vers le kit,
 *   dépôt imbriqué que ni git ni `.worktreeinclude` ne lui apportent.
 * Un JSON invalide est signalé et laissé tel quel.
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
      log.warn('[claude] .claude/settings.json invalide : attribution des commits et lien du kit en worktree non regles (corriger le JSON puis relancer sync)');
      return;
    }
  }
  const changes = [];
  if (!(cfg.attribution === false || cfg.attribution?.commit === '')) {
    const current = cfg.attribution && typeof cfg.attribution === 'object' ? cfg.attribution : {};
    cfg.attribution = { ...current, commit: '' };
    changes.push('attribution des commits desactivee');
  }
  const worktree = cfg.worktree && typeof cfg.worktree === 'object' && !Array.isArray(cfg.worktree) ? cfg.worktree : {};
  const linked = Array.isArray(worktree.symlinkDirectories) ? worktree.symlinkDirectories : [];
  if (!linked.includes('workflow-kit')) {
    cfg.worktree = { ...worktree, symlinkDirectories: [...linked, 'workflow-kit'] };
    changes.push('worktree.symlinkDirectories += workflow-kit');
  }
  if (!changes.length) return;
  writeUtf8(p, JSON.stringify(cfg, null, 2) + '\n');
  log.info(`[claude] .claude/settings.json : ${changes.join(' ; ')}`);
}

const WT_START = '# workflow-kit:start (genere par workflow-kit, ne pas editer ce bloc)';
const WT_END = '# workflow-kit:end';
const WT_BLOCK = `${WT_START}
# Fichiers generes par le kit (ignores par git), copies dans chaque worktree cree par Claude Code.
# Le kit lui-meme est un depot imbrique que cette copie ne voit pas : il arrive par worktree.symlinkDirectories.
.claude/agents/**
.claude/skills/**
.claude/commands/**
${WT_END}`;

/**
 * Insère ou met à jour le bloc géré de `.worktreeinclude` ; les lignes du projet (ex. `.env`) ne sont jamais touchées.
 * Seuls les fichiers ignorés par git sont copiés : les motifs de dossier ne dupliquent pas les agents et skills suivis du projet.
 */
function ensureWorktreeInclude({ target, log }) {
  const p = path.join(target, '.worktreeinclude');
  const current = exists(p) ? readUtf8(p) : '';
  const re = new RegExp(`${WT_START.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}[\\s\\S]*?${WT_END}`);
  const next = re.test(current) ? current.replace(re, () => WT_BLOCK) : current ? `${current.replace(/\s*$/, '')}\n\n${WT_BLOCK}\n` : `${WT_BLOCK}\n`;
  if (next !== current) {
    writeUtf8(p, next);
    log.info('[claude] .worktreeinclude : bloc workflow-kit a jour');
  }
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
 * core/ (neutre) -> .claude/{agents,skills,commands} + bloc CLAUDE.md + `attribution.commit` et `worktree.symlinkDirectories`
 * de .claude/settings.json + bloc de .worktreeinclude.
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
  // Agent retiré du kit : son fichier généré est supprimé (jamais un fichier du projet portant le même nom).
  for (const retired of RETIRED_AGENTS) {
    const stale = path.join(claudeDir, 'agents', `${retired}.md`);
    if (exists(stale) && new RegExp(`^---\\r?\\nname: ${retired}\\r?\\n`).test(readUtf8(stale))) {
      remove(stale);
      log.info(`[claude] agent retire du kit supprime : agents/${retired}.md`);
    }
  }

  const skillsDir = path.join(coreDir, 'skills');
  const skillNames = exists(skillsDir) ? fs.readdirSync(skillsDir, { withFileTypes: true }).filter((d) => d.isDirectory()).map((d) => d.name) : [];
  for (const name of skillNames) {
    for (const f of walk(path.join(skillsDir, name))) writeUtf8(path.join(claudeDir, 'skills', name, rel(path.join(skillsDir, name), f)), readUtf8(f));
  }

  // Sous Claude Code une skill est déjà invocable en /<nom> : une commande du même nom la masquerait.
  // Vaut pour les skills du core comme pour une skill propre au projet dans .claude/skills/.
  // Les skills d'un pack vivent dans .agents/skills/, que Claude Code ne lit pas : leur commande y renvoie.
  const isSkill = (name) => skillNames.includes(name) || exists(path.join(claudeDir, 'skills', name, 'SKILL.md'));
  const skipped = [];
  const commandFiles = [];
  for (const commandsDir of [path.join(coreDir, 'commands'), ctx.packCommandsDir]) {
    for (const f of walk(commandsDir)) {
      const name = path.basename(f, '.md');
      const r = rel(commandsDir, f);
      if (commandFiles.includes(r)) continue; // le core prime sur le pack
      if (isSkill(name)) {
        skipped.push(name);
        continue;
      }
      writeUtf8(path.join(claudeDir, 'commands', r), readUtf8(f));
      commandFiles.push(r);
    }
  }
  log.info(`[claude] agents/, skills/${skipped.length ? '' : ', commands/'} -> .claude/ [genere]${skipped.length ? ` (commandes ${skipped.join(', ')} = skills du meme nom, non dupliquees)` : ''}`);

  ensureClaudeMd(ctx);
  ensureSettings(ctx);
  ensureWorktreeInclude(ctx);
  return {
    ignore: [
      ...ignoreFor(claudeDir, 'agents', agentFiles),
      ...ignoreFor(claudeDir, 'skills', skillNames, '/'),
      ...ignoreFor(claudeDir, 'commands', commandFiles),
    ],
  };
}
