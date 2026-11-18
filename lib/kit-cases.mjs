import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { AGENTS_START, agentsMdBlock, staleAgentsMdBlock } from './agents-md.mjs';
import { cloturerRecette } from './cloturer.mjs';
import { derive } from './derive.mjs';
import { kitCopies, staleKitCopies } from './kit-copies.mjs';
import { sync } from './sync.mjs';
import { exists, readUtf8, remove, writeUtf8 } from './util.mjs';

/** Entrée de spec parallèle minimale (en vigueur ou caduque). */
function entree(id, { statut = '✅ en vigueur (validé 2026-01-01)', extra = [], garde = '`FooTest::test_a`' } = {}) {
  return [`### ${id} — règle ${id}`, '', `> **Statut** : ${statut} · **Type** : PRECISE`, ...extra, `> **Mots-clés** : x`, `> **Gardé par** : ${garde}`, '', 'Règle.', ''].join('\n');
}
function spec(rows, entries) {
  return ['# Spec', '', '## Index', '', '| ID | Statut |', '|---|---|', ...rows.map(([id, st]) => `| ${id} | ${st} |`), '', '## Entrées', '', ...entries].join('\n');
}

/**
 * Copies tenues par le kit : posées à l'identique, rétablies si modifiées (jamais en quarantaine), copie périmée signalée ;
 * la copie du contrôle de la spec tourne seule (Node, sans le kit) et applique les renvois réciproques.
 */
export function copiesCases(kitRoot) {
  const failures = [];
  let count = 0;
  const tmp = path.join(os.tmpdir(), 'workflow-kit-copies');
  remove(tmp);
  const t = path.join(tmp, 'projet');
  fs.mkdirSync(t, { recursive: true });
  const check = (label, ok) => {
    count++;
    if (!ok) failures.push(label);
  };
  try {
    sync({ kitRoot, target: t, stack: 'laravel-livewire', runtimes: ['opencode'], quiet: true });
    const copies = kitCopies(kitRoot, 'laravel-livewire');
    check('deux copies tenues par le kit (contrôle de la spec, format d\'écriture)', copies.length === 2);
    for (const c of copies) check(`${c.dest} posée à l'identique`, exists(path.join(t, c.dest)) && readUtf8(path.join(t, c.dest)) === readUtf8(c.source));
    check('aucune copie périmée après synchronisation', staleKitCopies(kitRoot, 'laravel-livewire', t).length === 0);
    const copie = path.join(t, '.agents/specs/verifier-spec.mjs');
    writeUtf8(copie, '// modifiée à la main\n');
    check('copie modifiée à la main : signalée périmée', staleKitCopies(kitRoot, 'laravel-livewire', t).some((p) => p.includes('périmée')));
    sync({ kitRoot, target: t, stack: 'laravel-livewire', runtimes: ['opencode'], quiet: true });
    check('copie rétablie par la synchronisation', readUtf8(copie) === readUtf8(path.join(kitRoot, 'lib/verifier-spec.mjs')));
    check('copie jamais mise en quarantaine', !exists(path.join(t, '.agents/doublons/.agents/specs/verifier-spec.mjs')) && !exists(path.join(t, '.agents/doublons/specs/verifier-spec.mjs')));

    // Contrôle autonome : la copie seule, lancée par Node depuis un dossier sans kit
    const lancer = (texte) => {
      const f = path.join(tmp, 'seul', 'spec-parallele.md');
      writeUtf8(f, texte);
      const seul = path.join(tmp, 'seul', 'verifier-spec.mjs');
      fs.copyFileSync(copie, seul);
      writeUtf8(path.join(tmp, 'seul', 'tests', 'FooTest.php'), '<?php\nclass FooTest { public function test_a(): void {} public function test_e1_debut(): void {} }\n');
      writeUtf8(path.join(tmp, 'seul', 'src', 'ui', 'tests', 'theme.test.ts'), "describe('#resolveTheme', () => { it('garde le thème', () => {}) });\n");
      try {
        return { code: 0, out: execFileSync(process.execPath, [seul], { cwd: path.join(tmp, 'seul'), encoding: 'utf8' }) };
      } catch (e) {
        return { code: e.status, out: `${e.stdout ?? ''}` };
      }
    };
    const rows = [
      ['SP-X-01', '✅ en vigueur (2026-01-01)'],
      ['SP-X-02', '✅ en vigueur (2026-01-01)'],
    ];
    const sansRetour = spec(rows, [entree('SP-X-01'), entree('SP-X-02', { extra: ['> **Amende** : SP-X-01 (partie a)'] })]);
    const r1 = lancer(sansRetour);
    check('renvoi « Amende » sans retour : écart, code 1', r1.code === 1 && /SP-X-01 amendée par SP-X-02/.test(r1.out));
    const avecRetour = spec(rows, [entree('SP-X-01', { extra: ['> **Amendé par** : SP-X-02 (2026-01-02) — partie a'] }), entree('SP-X-02', { extra: ['> **Amende** : SP-X-01 (partie a)'] })]);
    const r2 = lancer(avecRetour);
    check('renvoi réciproque : ok, code 0', r2.code === 0 && /\[ok\]/.test(r2.out));
    const relais = spec(
      [...rows, ['SP-X-03', '⛔ caduc (→ SP-X-02)']],
      [
        entree('SP-X-01', { extra: ['> **Amendé par** : SP-X-02 (2026-01-03) — reprend SP-X-03'] }),
        entree('SP-X-02', { extra: ['> **Remplace** : SP-X-03'] }),
        entree('SP-X-03', { statut: '⛔ caduc (→ SP-X-02) — depuis le 2026-01-03', extra: ['> **Amende** : SP-X-01 (partie a)'] }),
      ],
    );
    check('amendeur caduc relayé par son successeur : ok', lancer(relais).code === 0);

    // 6. Références « Gardé par » : toute techno, test renommé, abréviation, convention feature
    const un = [['SP-X-01', '✅ en vigueur (2026-01-01)']];
    const garde = (g) => lancer(spec(un, [entree('SP-X-01', { garde: g })]));
    check('« Gardé par » PHP et TypeScript (describe « #nom ») : ok', garde('`FooTest::test_a` · `src/ui/tests/theme.test.ts::resolveTheme` · `FooTest::test_e1…`').code === 0);
    const renomme = garde('`FooTest::test_ancien_nom`');
    check('test renommé : écart, code 1', renomme.code === 1 && /test introuvable dans FooTest\.php/.test(renomme.out));
    check('fichier de test introuvable : écart', /fichier introuvable/.test(garde('`src/ui/tests/absent.test.ts::x`').out));
    const feature = (g) => lancer(spec(un, [entree('SP-X-01', { garde: g })]).replace('## Index', '- **Gardé par** (convention du projet) : `feature`\n\n## Index'));
    check('convention feature, DONE absent : écart', /fichier de feature introuvable/.test(feature('A1 (`DONE-a1.md`)').out));
  } catch (e) {
    failures.push(`exception : ${e.message}`);
  }
  remove(tmp);
  return { count, failures };
}

/**
 * Bloc géré d'AGENTS.md : posé avec le modèle dans un projet neuf, ajouté à un AGENTS.md existant sans toucher au
 * reste, stable d'une synchronisation à l'autre, rétabli s'il est périmé, jamais doublé, signalé par `check-meta`.
 */
export function agentsMdCases(kitRoot) {
  const failures = [];
  let count = 0;
  const check = (label, ok) => {
    count++;
    if (!ok) failures.push(label);
  };
  const tmp = path.join(os.tmpdir(), 'workflow-kit-agents-md');
  remove(tmp);
  const run = (t) => sync({ kitRoot, target: t, stack: 'laravel-livewire', runtimes: ['opencode'], quiet: true });
  const occurrences = (text) => text.split(AGENTS_START).length - 1;
  const bloc = agentsMdBlock(kitRoot);
  try {
    const neuf = path.join(tmp, 'neuf');
    fs.mkdirSync(neuf, { recursive: true });
    run(neuf);
    const posé = readUtf8(path.join(neuf, 'AGENTS.md'));
    check('projet neuf : modèle posé et bloc présent une fois', posé.startsWith(readUtf8(path.join(kitRoot, 'project/AGENTS.md')).trimEnd()) && occurrences(posé) === 1 && posé.includes(bloc));
    check('projet neuf : check-meta sans écart', staleAgentsMdBlock(kitRoot, neuf).length === 0);
    run(neuf);
    check('deuxième synchronisation : AGENTS.md inchangé', readUtf8(path.join(neuf, 'AGENTS.md')) === posé);

    const ancien = path.join(tmp, 'ancien');
    const propre = '# Projet existant\r\n\r\nContenu écrit par l\'équipe.\r\n';
    writeUtf8(path.join(ancien, 'AGENTS.md'), propre);
    check('AGENTS.md existant sans bloc : signalé', staleAgentsMdBlock(kitRoot, ancien).some((p) => p.includes('absent')));
    run(ancien);
    const complété = readUtf8(path.join(ancien, 'AGENTS.md'));
    check('AGENTS.md existant : contenu du projet gardé, bloc ajouté une fois', complété.startsWith(propre.trimEnd()) && occurrences(complété) === 1);
    check('AGENTS.md existant en CRLF : bloc en CRLF', !/[^\r]\n/.test(complété));

    const périmé = complété.replace(/Hors d'une étape de feature/, 'Ancienne règle');
    writeUtf8(path.join(ancien, 'AGENTS.md'), périmé);
    check('bloc modifié à la main : signalé périmé', staleAgentsMdBlock(kitRoot, ancien).some((p) => p.includes('périmé')));
    run(ancien);
    check('bloc périmé : rétabli sur place, sans doublon', readUtf8(path.join(ancien, 'AGENTS.md')) === complété);

    const lien = path.join(tmp, 'lien');
    const cible = path.join(tmp, 'cible.md');
    writeUtf8(cible, '# Cible\n');
    fs.mkdirSync(lien, { recursive: true });
    fs.symlinkSync(cible, path.join(lien, 'AGENTS.md'), 'file');
    run(lien);
    check('AGENTS.md lien : cible jamais modifiée', readUtf8(cible) === '# Cible\n');
  } catch (e) {
    // Lien symbolique de fichier refusé (Windows sans mode développeur) : le cas du lien est sauté, les autres restent.
    if (e.code !== 'EPERM') failures.push(`exception : ${e.message}`);
  }
  remove(tmp);
  return { count, failures };
}

/**
 * Dérive : dépôt git jetable, deux auteurs. Seuls les commits de l'autre auteur, postérieurs à la règle et à votre
 * dernier passage, sont listés ; une règle mise à jour ensuite n'est plus listée ; convention `feature` : partie règles sans objet.
 */
export function deriveCases() {
  const failures = [];
  let count = 0;
  const check = (label, ok) => {
    count++;
    if (!ok) failures.push(label);
  };
  const tmp = path.join(os.tmpdir(), 'workflow-kit-derive');
  remove(tmp);
  const root = path.join(tmp, 'depot');
  try {
    fs.mkdirSync(root, { recursive: true });
    const g = (...args) => execFileSync('git', ['-C', root, ...args], { stdio: 'pipe', encoding: 'utf8' });
    const commit = (email, msg) => {
      g('add', '-A');
      g('-c', `user.name=${email.split('@')[0]}`, '-c', `user.email=${email}`, 'commit', '-q', '-m', msg);
      return g('rev-parse', 'HEAD').trim();
    };
    g('init', '-q');
    const S = '.agents/specs/spec-parallele.md';
    const rows = [
      ['SP-X-01', '✅ en vigueur (2026-01-01)'],
      ['SP-X-02', '✅ en vigueur (2026-01-01)'],
      ['SP-Y-01', '✅ en vigueur (2026-01-01)'],
    ];
    const base = [entree('SP-X-01', { garde: '`FooTest::test_a`' }), entree('SP-X-02', { garde: '`BarTest`' }), entree('SP-Y-01', { garde: '`FooTest`' })];
    writeUtf8(path.join(root, S), spec(rows, base));
    writeUtf8(path.join(root, 'tests/FooTest.php'), 'a\n');
    writeUtf8(path.join(root, 'tests/BarTest.php'), 'b\n');
    writeUtf8(path.join(root, 'src/app.php'), '1\n');
    commit('moi@x', 'init');
    writeUtf8(path.join(root, 'tests/FooTest.php'), 'a2\n');
    const autre = commit('autre@x', 'change Foo');
    const moi = ['moi@x'];

    let r = derive({ root, regles: ['SP-X'], auteurs: moi });
    check('test garant modifié par un autre : commit listé', r.commits.length === 1 && r.commits[0].hash === autre);
    check('règles listées : celles du test modifié, dans la sélection', r.commits[0] && [...r.commits[0].tests.values()].flatMap((s) => [...s]).join() === 'SP-X-01');

    writeUtf8(path.join(root, S), spec(rows, [entree('SP-X-01', { garde: '`FooTest::test_a`', extra: ['> **Amendé par** : SP-X-02 (2026-01-02) — mis à jour'] }), ...base.slice(1)]));
    commit('moi@x', 'règle mise à jour');
    r = derive({ root, regles: ['SP-X'], auteurs: moi });
    check('règle mise à jour après le commit : plus listée', r.commits.length === 0);

    writeUtf8(path.join(root, 'src/app.php'), '2\n');
    writeUtf8(path.join(root, 'src/autre.php'), 'x\n');
    const autre2 = commit('autre@x', 'change app');
    r = derive({ root, fichiers: ['src/app.php', 'src/autre.php'], auteurs: moi });
    check('fichier modifié par un autre depuis votre dernier commit : listé', r.commits.length === 1 && r.commits[0].hash === autre2);
    check('fichier jamais modifié par vous : non examiné', r.nonExamines.join() === 'src/autre.php');
    r = derive({ root, fichiers: ['src/app.php:12', 'src/app.php:3-8'], auteurs: moi });
    check('fichier:ligne de l\'explorateur : ligne retirée, examiné une fois', r.commits.length === 1 && r.commits[0].hash === autre2 && r.fichiers === 1);
    check('préfixe « SP » : toutes les règles', derive({ root, regles: ['SP'], auteurs: moi }).regles === 3);
    check('vos propres commits jamais listés', derive({ root, fichiers: ['src/app.php'], auteurs: ['autre@x'] }).commits.length === 0);

    writeUtf8(path.join(root, S), spec(rows, base).replace(/`FooTest::test_a`|`BarTest`|`FooTest`/g, 'A1 (`DONE-a.md`)'));
    commit('moi@x', 'convention feature');
    r = derive({ root, regles: ['SP-X'], auteurs: moi });
    check('convention feature : partie règles sans objet', r.convention === 'feature' && r.commits.length === 0);
  } catch (e) {
    failures.push(`exception : ${e.message}`);
  }
  remove(tmp);
  return { count, failures };
}

/**
 * Clôture d'une branche de recette : refus qui ne suppriment rien (autre préfixe, worktree non propre, commits non
 * poussés, lancée depuis le worktree, branche extraite dans le checkout principal, branche introuvable), simulation,
 * clôture complète (démontage lancé dans le worktree, worktree, branche locale et distante), lien du worktree vers le
 * checkout principal jamais suivi, branche sans worktree.
 */
export function cloturerCases() {
  const failures = [];
  let count = 0;
  const check = (label, ok) => {
    count++;
    if (!ok) failures.push(label);
  };
  const tmp = path.join(os.tmpdir(), 'workflow-kit-cloturer');
  remove(tmp);
  const origin = path.join(tmp, 'origin.git');
  const main = path.join(tmp, 'main');
  const wt = path.join(tmp, 'wt');
  const quiet = { log: () => {}, error: () => {} };
  const g = (cwd, ...args) => execFileSync('git', ['-C', cwd, ...args], { stdio: 'pipe', encoding: 'utf8' }).trim();
  const id = ['-c', 'user.name=verify', '-c', 'user.email=verify@localhost'];
  const has = (ref) => {
    try {
      g(main, 'rev-parse', '--verify', '--quiet', ref);
      return true;
    } catch {
      return false;
    }
  };
  const onRemote = (b) => g(main, 'ls-remote', '--heads', 'origin', `refs/heads/${b}`) !== '';
  try {
    fs.mkdirSync(tmp, { recursive: true });
    execFileSync('git', ['init', '-q', '--bare', origin], { stdio: 'pipe' });
    fs.mkdirSync(main);
    g(main, 'init', '-q');
    writeUtf8(path.join(main, '.gitignore'), 'workflow-kit\n');
    writeUtf8(path.join(main, 'README.md'), 'demo\n');
    writeUtf8(path.join(main, 'workflow-kit/core/index.md'), 'kit\n');
    g(main, 'add', '.');
    g(main, ...id, 'commit', '-q', '-m', 'init');
    g(main, 'remote', 'add', 'origin', origin);
    g(main, 'worktree', 'add', '-q', '-b', 'recette/demo', wt);
    fs.symlinkSync(path.join(main, 'workflow-kit'), path.join(wt, 'workflow-kit'), process.platform === 'win32' ? 'junction' : 'dir');
    writeUtf8(path.join(wt, 'RECETTE.md'), 'fiche\n');
    g(wt, 'add', 'RECETTE.md');
    g(wt, ...id, 'commit', '-q', '-m', 'fiche');

    const intact = () => exists(wt) && has('refs/heads/recette/demo');
    check('autre préfixe que recette/ : refusé', cloturerRecette({ target: main, branche: 'feat/demo', log: quiet }) === 1 && intact());
    check('jamais poussée : refusée, rien supprimé', cloturerRecette({ target: main, branche: 'demo', log: quiet }) === 1 && intact());
    g(wt, 'push', '-q', '-u', 'origin', 'recette/demo');
    writeUtf8(path.join(wt, 'RECETTE.md'), 'fiche modifiée\n');
    check('worktree non propre : refusé, rien supprimé', cloturerRecette({ target: main, branche: 'demo', log: quiet }) === 1 && intact());
    g(wt, ...id, 'commit', '-q', '-am', 'constats');
    check('commits non poussés : refusés, rien supprimé', cloturerRecette({ target: main, branche: 'demo', log: quiet }) === 1 && intact());
    g(wt, 'push', '-q');
    check('lancée depuis le worktree à retirer : refusée', cloturerRecette({ target: wt, branche: 'demo', log: quiet }) === 1 && intact());
    check('simulation : rien supprimé', cloturerRecette({ target: main, branche: 'recette/demo', dryRun: true, log: quiet }) === 0 && intact() && onRemote('recette/demo'));
    check('branche introuvable : refusée', cloturerRecette({ target: main, branche: 'absente', log: quiet }) === 1);

    const marque = path.join(tmp, 'demontage.txt');
    const teardown = `node -e "require('fs').writeFileSync('${marque.split(path.sep).join('/')}', process.cwd())"`;
    const code = cloturerRecette({ target: main, branche: 'demo', teardown, log: quiet });
    check('clôture complète : code 0', code === 0);
    check('démontage lancé dans le worktree', exists(marque) && path.resolve(readUtf8(marque)).toLowerCase() === path.resolve(wt).toLowerCase());
    check('worktree retiré', !exists(wt) && !g(main, 'worktree', 'list').includes(wt));
    check('kit du checkout principal intact (lien du worktree non suivi)', exists(path.join(main, 'workflow-kit/core/index.md')));
    check('branche locale supprimée', !has('refs/heads/recette/demo'));
    check('branche distante supprimée', !onRemote('recette/demo'));

    g(main, ...id, 'checkout', '-q', '-b', 'recette/principal');
    g(main, 'push', '-q', '-u', 'origin', 'recette/principal');
    check('branche extraite dans le checkout principal : refusée', cloturerRecette({ target: main, branche: 'principal', log: quiet }) === 1 && has('refs/heads/recette/principal'));
    g(main, 'checkout', '-q', '-');
    check('branche sans worktree : locale et distante supprimées', cloturerRecette({ target: main, branche: 'principal', log: quiet }) === 0 && !has('refs/heads/recette/principal') && !onRemote('recette/principal'));
  } catch (e) {
    failures.push(`exception : ${e.message}`);
  }
  remove(tmp);
  return { count, failures };
}
