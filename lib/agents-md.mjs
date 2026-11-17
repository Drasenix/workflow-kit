import path from 'node:path';
import { exists, isLink, readBlock, readUtf8, upsertBlock, writeUtf8 } from './util.mjs';

/**
 * Bloc géré d'AGENTS.md : les règles qui n'existent que parce que le workflow existe. AGENTS.md appartient au projet
 * (posé une seule fois, jamais écrasé) ; ce bloc seul est réécrit à chaque synchronisation, quel que soit l'âge du
 * projet ou l'outil qui a créé le fichier. AGENTS.md est le seul fichier lu par tous les outils (opencode, Codex,
 * Cursor… ; Claude Code par l'import `@AGENTS.md` de CLAUDE.md) : le texte y est en clair, sans import.
 */
export const AGENTS_START = '<!-- workflow-kit:start (genere par workflow-kit depuis workflow-kit/project/AGENTS.bloc.md, ne pas editer ce bloc) -->';
export const AGENTS_END = '<!-- workflow-kit:end -->';

const source = (kitRoot) => path.join(kitRoot, 'project', 'AGENTS.bloc.md');

/** Bloc attendu, marqueurs compris (fins de ligne LF). */
export function agentsMdBlock(kitRoot) {
  return `${AGENTS_START}\n${readUtf8(source(kitRoot)).replace(/\r\n/g, '\n').trim()}\n${AGENTS_END}`;
}

/** Insère ou met à jour le bloc géré d'AGENTS.md ; le reste du fichier n'est jamais touché. */
export function ensureAgentsMd({ kitRoot, target, log }) {
  if (!exists(source(kitRoot))) return;
  const p = path.join(target, 'AGENTS.md');
  if (isLink(p)) {
    log.warn(`AGENTS.md est un lien : bloc workflow-kit non ajoute, le reporter a la main dans sa cible depuis ${source(kitRoot)}`);
    return;
  }
  const current = exists(p) ? readUtf8(p) : '';
  const next = upsertBlock(current, AGENTS_START, AGENTS_END, agentsMdBlock(kitRoot));
  if (next !== current) {
    writeUtf8(p, next);
    log.info('[project] AGENTS.md : bloc workflow-kit a jour');
  }
}

/** Bloc d'AGENTS.md absent ou différent de celui du kit, dans le projet `root`. */
export function staleAgentsMdBlock(kitRoot, root) {
  if (!exists(source(kitRoot))) return [];
  const p = path.join(root, 'AGENTS.md');
  if (!exists(p)) return ['`AGENTS.md` absent : relancer `workflow-kit sync`'];
  const text = readUtf8(p);
  const found = readBlock(text, AGENTS_START, AGENTS_END);
  if (found === null) return ['bloc workflow-kit absent de `AGENTS.md` : relancer `workflow-kit sync`'];
  if (found !== agentsMdBlock(kitRoot)) return ['bloc workflow-kit de `AGENTS.md` périmé (différent du kit) : relancer `workflow-kit sync`, sans le modifier à la main'];
  if (text.split(AGENTS_START).length > 2) return ['bloc workflow-kit présent plusieurs fois dans `AGENTS.md` : garder un seul bloc, puis relancer `workflow-kit sync`'];
  return [];
}
