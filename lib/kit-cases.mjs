import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
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
