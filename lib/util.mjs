import fs from 'node:fs';
import path from 'node:path';
import readline from 'node:readline/promises';

export const readUtf8 = (p) => fs.readFileSync(p, 'utf8');

export function writeUtf8(p, text) {
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, text, 'utf8');
}

export const exists = (p) => fs.existsSync(p);

export function isLink(p) {
  try {
    return fs.lstatSync(p).isSymbolicLink();
  } catch {
    return false;
  }
}

/** Liste récursive des fichiers (chemins absolus). `skip(name)` filtre les dossiers/fichiers par nom. */
export function walk(root, skip = () => false) {
  const out = [];
  if (!fs.existsSync(root)) return out;
  for (const entry of fs.readdirSync(root, { withFileTypes: true })) {
    if (skip(entry.name)) continue;
    const full = path.join(root, entry.name);
    if (entry.isDirectory()) out.push(...walk(full, skip));
    else out.push(full);
  }
  return out;
}

export const rel = (root, full) => path.relative(root, full).split(path.sep).join('/');

export function remove(p) {
  fs.rmSync(p, { recursive: true, force: true });
}

/** Supprime un lien (junction/symlink) SANS suivre sa cible. */
export function removeLink(p) {
  fs.unlinkSync(p);
}

export function move(from, to) {
  fs.mkdirSync(path.dirname(to), { recursive: true });
  fs.renameSync(from, to);
}

export async function prompt(label, def = '') {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  const ans = (await rl.question(def ? `${label} [${def}] ` : `${label} `)).trim();
  rl.close();
  return ans || def;
}

export const today = () => new Date().toISOString().slice(0, 10);

export const logger = (quiet = false) => ({
  info: (...a) => !quiet && console.log(...a),
  warn: (...a) => !quiet && console.warn('WARN', ...a),
});
