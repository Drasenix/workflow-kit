/**
 * Source neutre d'un agent (core/agents/<nom>.md) :
 *
 *   ---
 *   name: <nom>
 *   description: <texte>
 *   tools:
 *     read: allow      # actions : read, edit, shell, glob, grep, webfetch
 *     shell: deny      # une action absente = défaut de l'outil
 *   ---
 *   <corps>
 */
export function parseAgent(text) {
  const m = text.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n/);
  if (!m) throw new Error('frontmatter absent');
  const fm = m[1].split(/\r?\n/);
  const out = { name: '', description: '', tools: [], body: text.slice(m[0].length) };
  let inTools = false;
  for (const line of fm) {
    const tool = inTools && line.match(/^\s+(\w+):\s*(allow|deny)\s*$/);
    if (tool) {
      out.tools.push([tool[1], tool[2]]);
      continue;
    }
    inTools = false;
    const kv = line.match(/^(\w+):\s*(.*)$/);
    if (!kv) continue;
    if (kv[1] === 'tools') inTools = true;
    else if (kv[1] === 'name' || kv[1] === 'description') out[kv[1]] = kv[2];
  }
  return out;
}
