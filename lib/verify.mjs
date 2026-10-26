import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { exists, readUtf8, rel, remove, walk, writeUtf8 } from './util.mjs';
import { auditCore } from './audit-core.mjs';
import { checkCases } from './check-cases.mjs';
import { sync } from './sync.mjs';

const c = { cyan: (s) => `\x1b[36m${s}\x1b[0m`, yellow: (s) => `\x1b[33m${s}\x1b[0m`, green: (s) => `\x1b[32m${s}\x1b[0m` };
const SKIP = (n) => n === 'node_modules' || n === '.git';
const listMd = (root) => walk(root, SKIP).filter((f) => /\.(md|json)$/.test(f));
const strip = (t) => t.replace(/\{\{[A-Z0-9_]+\}\}/g, '');
const uniq = (a) => [...new Set(a)];

const CORE_FORBID = [
  // projet
  'storvya', 'zindex', 'multicentre', 'raison_sociale', 'd_liste',
  // techno (le core ne doit pas en dependre)
  'livewire', 'laravel', 'blade', 'eloquent', 'artisan', 'composer', 'phpunit', '\\bpint\\b',
  'sanctum', 'tailwind', 'daisyui', 'vite', 'docker', 'mysql', 'sqlite', 'postgres', 'stripe', '\\bnpm\\b',
  '\\bphp\\b', '\\.php\\b', '\\.blade\\b', '#\\[[A-Z]',
];
const PACK_FORBID = [
  'storvya', 'zindex', 'stripe', 'ionos', 'signable', 'multicentre',
  'raison_sociale', 'd_liste', '\\bCentre\\b', '\\bFacture\\b', '\\bContrat\\b', '\\bSociete\\b', '\\bUnite\\b',
];
const DEAD = ['agent-frontend\\.md', 'agent-livewire\\.md', '\\.opencode/agent-', 'agent-opencode\\.md'];
const REQUIRED = [
  'core/index.md', 'core/agent-workflow.md', 'core/agent-build.md',
  'core/phase-raffinement.md', 'core/phase-realisation.md',
  'core/agents/raffineur.md', 'core/agents/explorateur.md', 'core/agents/challenger.md',
  'core/agents/test.md',
  'core/agents/dev.md', 'core/agents/review.md', 'core/agents/doc.md',
  'core/templates/feature.md',
  'packs/_schema.md', 'packs/_blank/pack.md', 'packs/laravel-livewire/pack.md',
];

/** Audit : agnosticisme du core, neutralité des packs, références mortes, fichiers requis, round-trip, cohérence interne du core, cas de référence du contrôle de feature. */
export function verify({ kitRoot, reportDir = path.join(os.tmpdir(), 'workflow-kit-verify') }) {
  kitRoot = path.resolve(kitRoot);
  fs.mkdirSync(reportDir, { recursive: true });
  let fail = 0;

  // 1. Lexique core
  console.log(c.cyan('=== 1. Core agnostique (ni projet, ni techno) ==='));
  const coreFiles = listMd(path.join(kitRoot, 'core')).filter((f) => !/package(-lock)?\.json$/.test(f)); // manifests locaux (plugin), git-ignores
  let coreHits = 0;
  for (const term of CORE_FORBID) {
    const re = new RegExp(term, 'i');
    const hits = coreFiles.filter((f) => re.test(strip(readUtf8(f)))).map((f) => path.basename(f));
    if (hits.length) {
      console.log(c.yellow(`  '${term}' -> ${hits.length} : ${uniq(hits).sort().join(', ')}`));
      coreHits++;
    }
  }
  if (!coreHits) console.log('  aucun terme interdit.');
  else fail++;

  const opencodeRefs = coreFiles.filter((f) => /\.opencode|\.workflow/.test(readUtf8(f))).map((f) => rel(kitRoot, f));
  if (opencodeRefs.length) {
    console.log(c.yellow(`  '.opencode' / '.workflow' (core neutre : il se cite a workflow-kit/core/) -> ${opencodeRefs.join(', ')}`));
    fail++;
  }

  // 2. Neutralité des packs (agents/ seulement)
  console.log(c.cyan('=== 2. Neutralite des packs (aucun terme projet) ==='));
  const packsRoot = path.join(kitRoot, 'packs');
  const packSeedFiles = fs
    .readdirSync(packsRoot, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .flatMap((d) => listMd(path.join(packsRoot, d.name, 'agents')));
  let packHits = 0;
  for (const term of PACK_FORBID) {
    const re = new RegExp(term, 'i');
    const hits = packSeedFiles.filter((f) => re.test(strip(readUtf8(f)))).map((f) => rel(kitRoot, f));
    if (hits.length) {
      console.log(c.yellow(`  '${term}' -> ${uniq(hits).sort().join(', ')}`));
      packHits++;
    }
  }
  if (!packHits) console.log('  aucun terme projet/metier.');
  else fail++;

  // 3. Références mortes
  console.log(c.cyan('=== 3. References mortes ==='));
  const deadHits = [];
  for (const f of listMd(packsRoot)) {
    const text = readUtf8(f);
    for (const p of DEAD) if (new RegExp(p, 'i').test(text)) deadHits.push(`${rel(kitRoot, f)} : ${p}`);
  }
  if (!deadHits.length) console.log('  aucune.');
  else {
    uniq(deadHits).sort().forEach((h) => console.log(c.yellow(`  ${h}`)));
    fail++;
  }

  // 4. Fichiers requis
  console.log(c.cyan('=== 4. Fichiers requis ==='));
  const missing = REQUIRED.filter((r) => !exists(path.join(kitRoot, r)));
  if (!missing.length) console.log('  tous presents.');
  else {
    missing.forEach((m) => console.log(c.yellow(`  ABSENT : ${m}`)));
    fail++;
  }

  // 5. Round-trip : un essai par combinaison de runtimes
  console.log(c.cyan('=== 5. Round-trip (materialisation generique, par runtime) ==='));
  const orphans = [];
  const rtProblems = [];
  const names = (dir) => (exists(dir) ? fs.readdirSync(dir) : []);
  for (const runtimes of [['opencode'], ['claude'], ['opencode', 'claude']]) {
    const label = runtimes.join('+');
    const tmp = path.join(os.tmpdir(), 'workflow-kit-roundtrip');
    remove(tmp);
    const t = path.join(tmp, 'target');
    fs.mkdirSync(t, { recursive: true });
    sync({ kitRoot, target: t, stack: 'laravel-livewire', projectName: 'demo', onConflict: 'overwrite', runtimes, quiet: true });

    for (const d of ['.opencode', '.claude', '.agents']) {
      for (const f of listMd(path.join(t, d))) {
        if (f.includes(`${path.sep}doublons${path.sep}`)) continue;
        const text = readUtf8(f);
        // .opencode/ et .claude/ = core verbatim : `YYYY-MM-DD` y est un exemple de format, pas un jeton de seed.
        const re = d === '.agents' ? /\{\{[A-Z0-9_]+\}\}|<Projet>|YYYY-MM-DD/g : /\{\{[A-Z0-9_]+\}\}/g;
        for (const m of text.matchAll(re)) orphans.push(`[${label}] ${path.basename(f)} : ${m[0]}`);
        if (d !== '.opencode' && /\.opencode/.test(text)) rtProblems.push(`[${label}] reference .opencode dans ${rel(t, f)}`);
        if (/\.workflow/.test(text)) rtProblems.push(`[${label}] reference .workflow dans ${rel(t, f)}`);
      }
    }

    const coreAgents = names(path.join(kitRoot, 'core/agents'));
    if (runtimes.includes('opencode')) {
      for (const n of coreAgents) {
        const f = path.join(t, '.opencode/agents', n);
        if (!exists(f) || !/^mode: (subagent|primary)$/m.test(readUtf8(f)) || !/^permissions:$/m.test(readUtf8(f))) rtProblems.push(`[${label}] agent opencode invalide : ${n}`);
      }
      if (!exists(path.join(t, 'opencode.json'))) rtProblems.push(`[${label}] opencode.json absent`);
    } else if (exists(path.join(t, '.opencode')) || exists(path.join(t, 'opencode.json'))) {
      rtProblems.push(`[${label}] artefacts opencode presents alors que le runtime n'est pas demande`);
    }
    if (runtimes.includes('claude')) {
      for (const n of coreAgents) {
        const f = path.join(t, '.claude/agents', n);
        const text = exists(f) ? readUtf8(f) : '';
        if (!new RegExp(`^---\\nname: ${path.basename(n, '.md')}\\ndescription: ".*"\\ntools: [A-Za-z, ]+\\n---\\n`).test(text)) rtProblems.push(`[${label}] agent claude invalide : ${n}`);
      }
      const md = exists(path.join(t, 'CLAUDE.md')) ? readUtf8(path.join(t, 'CLAUDE.md')) : '';
      if (!md.includes('workflow-kit:start') || !md.includes('@.agents/workflow-commands.md')) rtProblems.push(`[${label}] bloc CLAUDE.md absent`);
      if (!exists(path.join(t, '.claude/skills/consult-workflow/SKILL.md'))) rtProblems.push(`[${label}] skill claude absente`);
      let attribution;
      try {
        attribution = JSON.parse(readUtf8(path.join(t, '.claude/settings.json'))).attribution;
      } catch {
        attribution = undefined;
      }
      if (!(attribution === false || attribution?.commit === '')) rtProblems.push(`[${label}] attribution des commits non desactivee (.claude/settings.json)`);
    } else if (exists(path.join(t, '.claude')) || exists(path.join(t, 'CLAUDE.md'))) {
      rtProblems.push(`[${label}] artefacts claude presents alors que le runtime n'est pas demande`);
    }
    const gi = exists(path.join(t, '.gitignore')) ? readUtf8(path.join(t, '.gitignore')) : '';
    const expectedIgnore = ['workflow-kit/', ...(runtimes.includes('opencode') ? ['.opencode'] : []), ...(runtimes.includes('claude') ? ['.claude/agents/*', '.claude/skills/*'] : [])];
    for (const pat of expectedIgnore) if (!gi.split(/\r?\n/).includes(pat)) rtProblems.push(`[${label}] .gitignore sans ${pat}`);
    remove(tmp);
  }
  if (!orphans.length && !rtProblems.length) console.log('  opencode, claude, opencode+claude : OK.');
  else {
    uniq(orphans).sort().forEach((o) => console.log(c.yellow(`  RESIDU ${o}`)));
    uniq(rtProblems).forEach((p) => console.log(c.yellow(`  ${p}`)));
    fail++;
  }

  // 6. Migration d'un projet existant : anciens liens (.opencode, .workflow) -> core, chemins obsolètes dans .agents/
  console.log(c.cyan('=== 6. Migration (projet installe avec l\'ancien modele) ==='));
  const migProblems = [];
  {
    const tmp = path.join(os.tmpdir(), 'workflow-kit-migration');
    remove(tmp);
    const t = path.join(tmp, 'target');
    const oldCore = path.join(tmp, 'old-core');
    fs.mkdirSync(path.join(oldCore, 'agents'), { recursive: true });
    writeUtf8(path.join(oldCore, 'agents/sentinel.md'), 'ancien core');
    fs.mkdirSync(t, { recursive: true });
    fs.symlinkSync(oldCore, path.join(t, '.opencode'), 'junction'); // modele d'origine : .opencode = lien vers core
    const midCore = path.join(tmp, 'mid-core');
    fs.mkdirSync(midCore, { recursive: true });
    writeUtf8(path.join(midCore, 'sentinel.md'), 'core intermediaire');
    fs.symlinkSync(midCore, path.join(t, '.workflow'), 'junction'); // version intermediaire : .workflow = lien vers core
    writeUtf8(path.join(t, '.agents/feature/F.md'), 'Voir .opencode/agent-opencode.md, .opencode/agent-workflow.md, .opencode/command/doc.md et .opencode/skills/tests/SKILL.md, puis .workflow/index.md\n');
    sync({ kitRoot, target: t, stack: 'laravel-livewire', projectName: 'demo', runtimes: ['opencode'], quiet: true });

    const migrated = readUtf8(path.join(t, '.agents/feature/F.md'));
    const expected = 'Voir workflow-kit/core/agent-build.md, workflow-kit/core/agent-workflow.md, workflow-kit/core/commands/doc.md et .agents/skills/tests/SKILL.md, puis workflow-kit/core/index.md\n';
    if (migrated !== expected) migProblems.push(`chemins non migres : ${migrated.trim()}`);
    if (!exists(path.join(oldCore, 'agents/sentinel.md'))) migProblems.push('le contenu de l\'ancien core a ete touche a travers le lien');
    if (!exists(path.join(midCore, 'sentinel.md'))) migProblems.push('le contenu du core intermediaire a ete touche a travers le lien');
    if (exists(path.join(t, '.workflow'))) migProblems.push('.workflow existe encore');
    if (fs.lstatSync(path.join(t, '.opencode')).isSymbolicLink()) migProblems.push('.opencode est reste un lien');
    if (exists(path.join(t, '.opencode/agents/sentinel.md'))) migProblems.push('ancien contenu du lien reste dans .opencode/');
    remove(tmp);
  }
  if (!migProblems.length) console.log('  anciens liens retires, chemins migres, anciens cores intacts.');
  else {
    migProblems.forEach((p) => console.log(c.yellow(`  ${p}`)));
    fail++;
  }

  // 7. .gitignore Claude : motifs de dossier, sauf si le projet a deja ses propres agents/skills dans .claude/
  console.log(c.cyan('=== 7. .gitignore Claude (projet avec ou sans contenu propre dans .claude/) ==='));
  const giProblems = [];
  {
    const tmp = path.join(os.tmpdir(), 'workflow-kit-gitignore');
    const gitignoreOf = (t) => (exists(path.join(t, '.gitignore')) ? readUtf8(path.join(t, '.gitignore')).split(/\r?\n/) : []);
    // a) .claude/ vierge : deux motifs de dossier
    remove(tmp);
    const clean = path.join(tmp, 'clean');
    fs.mkdirSync(clean, { recursive: true });
    sync({ kitRoot, target: clean, stack: 'laravel-livewire', projectName: 'demo', runtimes: ['claude'], quiet: true });
    const gc = gitignoreOf(clean);
    for (const pat of ['.claude/agents/*', '.claude/skills/*']) if (!gc.includes(pat)) giProblems.push(`projet vierge : ${pat} attendu`);
    // b) .claude/ avec agents/skills du projet : nos fichiers un par un, jamais les motifs de dossier
    const own = path.join(tmp, 'own');
    writeUtf8(path.join(own, '.claude/agents/laravel-reviewer.md'), '---\nname: laravel-reviewer\ndescription: x\n---\n');
    writeUtf8(path.join(own, '.claude/skills/livewire-development/SKILL.md'), '---\nname: livewire-development\ndescription: x\n---\n');
    sync({ kitRoot, target: own, stack: 'laravel-livewire', projectName: 'demo', runtimes: ['claude'], quiet: true });
    const go = gitignoreOf(own);
    for (const pat of ['.claude/agents/*', '.claude/skills/*']) if (go.includes(pat)) giProblems.push(`projet avec contenu propre : ${pat} ignorerait ses fichiers`);
    for (const pat of ['.claude/agents/test.md', '.claude/skills/consult-workflow/']) if (!go.includes(pat)) giProblems.push(`projet avec contenu propre : ${pat} attendu`);
    if (go.some((l) => l.includes('laravel-reviewer') || l.includes('livewire-development'))) giProblems.push('un fichier du projet est ignore');
    for (const f of ['.claude/agents/laravel-reviewer.md', '.claude/skills/livewire-development/SKILL.md']) if (!exists(path.join(own, f))) giProblems.push(`fichier du projet perdu : ${f}`);
    remove(tmp);
  }
  if (!giProblems.length) console.log('  vierge : agents/* + skills/* ; contenu propre : fichiers un par un, contenu du projet intact.');
  else {
    giProblems.forEach((q) => console.log(c.yellow(`  ${q}`)));
    fail++;
  }

  // 8. Cohérence interne du core : tout ce qu'un texte cite existe (chemins, renvois §, sections du gabarit, commandes)
  console.log(c.cyan('=== 8. Coherence interne du core (chemins, renvois §, sections citees, commandes, restes) ==='));
  const coherence = auditCore(kitRoot);
  if (!coherence.length) console.log('  aucun ecart.');
  else {
    coherence.forEach((q) => console.log(c.yellow(`  ${q}`)));
    fail++;
  }

  // 9. Contrôle de feature : cas de référence des sections du gabarit à deux phases (Definition of Ready, plan, décisions techniques)
  console.log(c.cyan('=== 9. Controle de feature (cas de reference du gabarit a deux phases) ==='));
  const cases = checkCases(kitRoot);
  if (!cases.failures.length) console.log(`  ${cases.count} cas : OK.`);
  else {
    cases.failures.forEach((q) => console.log(c.yellow(`  ${q}`)));
    fail++;
  }

  // Rapport
  const report = path.join(reportDir, 'neutralite.txt');
  writeUtf8(
    report,
    [
      '# Rapport neutralite workflow-kit',
      `# core interdit : ${coreHits} terme(s)`,
      `# packs interdits : ${packHits} terme(s)`,
      `# refs mortes : ${deadHits.length}`,
      `# fichiers requis manquants : ${missing.length}`,
      `# jetons non resolus : ${orphans.length}`,
      `# problemes runtimes : ${rtProblems.length}`,
      `# ecarts de coherence du core : ${coherence.length}`,
      `# cas du controle de feature en echec : ${cases.failures.length} / ${cases.count}`,
    ].join('\n') + '\n',
  );

  console.log('');
  console.log(fail === 0 ? c.green('AUDIT : OK (aucun ecart bloquant).') : c.yellow(`AUDIT : ${fail} point(s) a examiner.`));
  console.log(`Rapport : ${report}`);
  return fail;
}
