import * as opencode from '../adapters/opencode/index.mjs';
import * as claude from '../adapters/claude/index.mjs';

export const adapters = { opencode, claude };
export const RUNTIMES = Object.keys(adapters);

/** 'opencode' | 'claude' | 'both' (ou liste séparée par des virgules) -> ['opencode', 'claude'] */
export function parseRuntimes(value) {
  if (!value) return null;
  const list = [].concat(value).flatMap((v) => String(v).split(',')).map((v) => v.trim()).filter(Boolean);
  const out = list.flatMap((v) => (v === 'both' ? RUNTIMES : [v]));
  for (const r of out) if (!RUNTIMES.includes(r)) throw new Error(`Runtime inconnu : '${r}'. Disponibles : ${RUNTIMES.join(', ')}, both`);
  return [...new Set(out)];
}
