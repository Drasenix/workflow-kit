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
import { buildSommaire, checkUtilitairesFile } from './verifier-utilitaires.mjs';
import { checkTolerances } from './check-meta.mjs';
import { checkEtiquettes, checkSommaireRegles, writeSommaireRegles } from './regles.mjs';
import { ligneRecherches, recherchesProblems } from './check.mjs';
import { checkCompaction, compactFeature, ligneDecisionsDejaCodees, MARK } from './compact.mjs';

/**
 * Ligne « Décisions déjà codées » d'un DONE (K1) : calculée sur la version complète (extractions du plan, rattrapages de
 * la revue), écrite par `compact` dans les Leçons, contrôlée par `compact --check` ; absente pour un fichier antérieur.
 */
export function decisionsDejaCodeesCases() {
  const failures = [];
  let count = 0;
  const check = (label, ok) => {
    count++;
    if (!ok) failures.push(label);
  };
  const tmp = path.join(os.tmpdir(), 'workflow-kit-deja-codees');
  remove(tmp);
  const fence = '```';
  const complet = (entete) => [
    '# Essai',
    '',
    '## Résumé métier',
    '',
    'Le gestionnaire voit le jour de validation.',
    '',
    '## Progression',
    '',
    '| # | Étape | Qui | Statut | Notes |',
    '|---|---|---|---|---|',
    '| 7 | Passage DONE | Build | ✅ 2026-01-02 | - |',
    '',
    '## Scénarios évolution - nouveau comportement (étape 1)',
    '',
    '### Scénario E1 - Nominal',
    'GIVEN une transmission validée',
    'WHEN le gestionnaire relance',
    'THEN le jour de validation est affiché',
    '',
    '## Plan (étape 3)',
    '',
    '### Arbre de flux',
    '',
    fence,
    'relancer()',
    '└─ jourDeValidation()   E1',
    fence,
    '',
    '### Code existant réutilisé',
    '',
    `| ${entete} | Fichier | Utilisation |`,
    '|---|---|---|',
    "| Jour de validation à l'heure de Paris | `src/a.php` | **Extraction** dans `T::jour()`, appelée des deux côtés |",
    "| `S::relancer()` | `src/s.php` | appel inchangé ; pas d'extraction |",
    '',
    'Recherches (à `abc1234`) : Aucune',
    '',
    '## Revue qualité (étape 5)',
    '',
    '### Checklist',
    '',
    '| # | Point | Statut |',
    '|---|---|---|',
    '| 3c | Condition nouvelle | ❌ Décision déjà codée non repérée au plan |',
    '',
    '### Problèmes détectés',
    '',
    '- **❌ Décision déjà codée non repérée au plan** : `X::a()` recopie `Y::b()`.',
    '- **❌ Duplication** : deux blocs identiques.',
    '',
  ].join('\n');
  const attendue = '- **Décisions déjà codées** : au plan, 1 extraite(s) ; en revue, 1 rattrapée(s)';
  const log = console.log;
  try {
    check('calculée sur la version complète (extraction en tête de cellule ; formule des problèmes seulement)', ligneDecisionsDejaCodees(complet('Utilitaire ou décision déjà codée')) === attendue);
    check('fichier antérieur (table sans « décision déjà codée ») : pas de ligne', ligneDecisionsDejaCodees(complet('Utilitaire')) === null);
    fs.mkdirSync(path.join(tmp, '.agents', 'feature'), { recursive: true });
    execFileSync('git', ['init', '-q', tmp], { stdio: 'ignore' });
    const file = path.join(tmp, '.agents', 'feature', 'DONE-essai.md');
    writeUtf8(file, complet('Utilitaire ou décision déjà codée'));
    console.log = () => {};
    compactFeature({ file });
    const compacte = fs.readFileSync(file, 'utf8');
    check('compact : ligne écrite dans les Leçons de réalisation', compacte.split('\n').includes(attendue) && compacte.indexOf(attendue) > compacte.indexOf('## Leçons de réalisation'));
    writeUtf8(file, compacte.split(MARK).join('x'));
    check('compact --check : ligne reprise telle quelle, sans écart', checkCompaction({ file }) === 0);
    writeUtf8(file, compacte.split(MARK).join('x').replace('1 extraite(s)', '2 extraite(s)'));
    check('compact --check : ligne modifiée, écart', checkCompaction({ file }) === 1);
    writeUtf8(file, compacte.split(MARK).join('x').replace(`${attendue}\n`, ''));
    check('compact --check : ligne retirée, écart', checkCompaction({ file }) === 1);
  } catch (e) {
    failures.push(`exception : ${e.message}`);
  } finally {
    console.log = log;
  }
  remove(tmp);
  return { count, failures };
}

/**
 * Ligne « Recherches » du plan : absente (fichier antérieur) sans écart ; non remplie ou hors format : écart ;
 * relancée au commit noté (fichiers suivis hors `.agents/` et `tests/`) : nombre juste sans écart, nombre faux : écart.
 */
export function recherchesCases() {
  const failures = [];
  let count = 0;
  const check = (label, ok) => {
    count++;
    if (!ok) failures.push(label);
  };
  const tmp = path.join(os.tmpdir(), 'workflow-kit-recherches');
  remove(tmp);
  const g = (...args) => execFileSync('git', ['-C', tmp, '-c', 'user.name=t', '-c', 'user.email=t@t', ...args], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });
  const section = (...lignes) => ({ n: 10, lines: ['', '| Utilitaire | Fichier | Utilisation |', '|---|---|---|', '', ...lignes] });
  try {
    fs.mkdirSync(tmp, { recursive: true });
    g('init', '-q', '-b', 'master');
    writeUtf8(path.join(tmp, 'src/a.php'), "jour('Europe/Paris');\nautre('Europe/Paris');\n");
    writeUtf8(path.join(tmp, 'tests/aTest.php'), "x('Europe/Paris');\n");
    writeUtf8(path.join(tmp, '.agents/notes.md'), 'Europe/Paris\n');
    g('add', '-A');
    g('commit', '-q', '-m', 'base');
    const commit = g('rev-parse', '--short', 'HEAD').trim();
    writeUtf8(path.join(tmp, 'src/b.php'), "jour('Europe/Paris');\n");
    check('ligne absente (fichier antérieur au gabarit) : sans écart', recherchesProblems(section(), tmp).length === 0);
    check('ligne du gabarit non remplie : écart', recherchesProblems(section('Recherches (à `<commit>`) : `<terme>` → <N> ; … (ou `Aucune`)'), tmp).some((p) => /non remplie ou hors format/.test(p)));
    check('Aucune : sans écart', recherchesProblems(section(`Recherches (à \`${commit}\`) : Aucune`), tmp).length === 0);
    check('nombre juste au commit noté (hors tests et .agents, code ajouté depuis ignoré) : sans écart', recherchesProblems(section(`Recherches (à \`${commit}\`) : \`Europe/Paris\` → 2`), tmp).length === 0);
    check('nombre faux : écart', recherchesProblems(section(`Recherches (à \`${commit}\`) : \`Europe/Paris\` → 0`), tmp).some((p) => /0 déclaré, 2 trouvé/.test(p)));
    check('terme absent, déclaré 0 : sans écart', recherchesProblems(section(`Recherches (à \`${commit}\`) : \`introuvable\` → 0`), tmp).length === 0);
    const gabarit = (...lignes) => ({ n: 10, lines: ['', '| Utilitaire ou décision déjà codée | Fichier | Utilisation |', '|---|---|---|', '', ...lignes] });
    check('en-tête du gabarit sans ligne Recherches : écart', recherchesProblems(gabarit(), tmp).some((p) => /absente/.test(p)));
    g('add', '-A');
    g('commit', '-q', '-m', 'suite');
    const produite = ligneRecherches(tmp, ['Europe/Paris', 'introuvable']);
    check('ligne produite par la commande (code ajouté compté, tests et .agents exclus) : au format, reproduite', /→ 3 ; `introuvable` → 0$/.test(produite) && recherchesProblems(gabarit(produite), tmp).length === 0);
    check('commande sans terme : Aucune', /: Aucune$/.test(ligneRecherches(tmp, [])));
    g('checkout', '-q', '-b', 'chantier');
    writeUtf8(path.join(tmp, 'src/c.php'), "jour('Europe/Paris');\n");
    g('add', '-A');
    g('commit', '-q', '-m', 'lot 1');
    const lot1 = g('rev-parse', '--short', 'HEAD').trim();
    check('chantier : le code du lot précédent, sur la branche, est compté (commit courant noté)', ligneRecherches(tmp, ['Europe/Paris']) === `Recherches (à \`${lot1}\`) : \`Europe/Paris\` → 4`);
    check('commit noté introuvable dans ce clone : non relancé, sans écart', recherchesProblems(gabarit('Recherches (à `0000000`) : `Europe/Paris` → 99'), tmp).length === 0);
  } catch (e) {
    failures.push(`exception : ${e.message}`);
  }
  remove(tmp);
  return { count, failures };
}

/**
 * Conventions exécutables : étiquettes des règles d'un fichier-rôle déclaré (puces et lignes de tableau), test cité
 * existant, fichier non déclaré ignoré ; sommaire des règles généré depuis les lignes `Règle :` des tests, périmé détecté.
 */
export function conventionsCases() {
  const failures = [];
  let count = 0;
  const check = (label, ok) => {
    count++;
    if (!ok) failures.push(label);
  };
  const tmp = path.join(os.tmpdir(), 'workflow-kit-conventions');
  remove(tmp);
  const conv = (regles) => ['# Conventions', '', '> **Règles étiquetées** : chaque règle porte « Gardée par » ou « Non mécanisable ».', '', '## Couches', '', ...regles, ''].join('\n');
  const garde = '`tests/architecture/CoucheTest.ts::verifie_les_couches`';
  try {
    fs.mkdirSync(tmp, { recursive: true });
    execFileSync('git', ['init', '-q', tmp]);
    writeUtf8(path.join(tmp, 'tests/architecture/CoucheTest.ts'), "/**\n * Règle : aucune vue n'interroge la base.\n */\nfunction verifie_les_couches() {}\n");
    const ecrire = (regles) => writeUtf8(path.join(tmp, '.agents/conventions.md'), conv(regles));
    const pbs = () => checkEtiquettes(tmp).flatMap((e) => e.problems);
    ecrire([`- **Vues** : pas de requête. *Gardée par : ${garde}*`, '- **Noms** : clairs. *Non mécanisable : jugement de lecture.*', '', '| Couche | Rôle |', '|---|---|', '| Action | métier. *Non mécanisable : découpage.* |']);
    check('règles étiquetées, test cité existant : sans écart', pbs().length === 0);
    ecrire(['- **Vues** : pas de requête.']);
    check('puce sans étiquette : écart', pbs().some((p) => /règle sans étiquette/.test(p)));
    ecrire(['| Couche | Rôle |', '|---|---|', '| Action | métier. |']);
    check('ligne de tableau sans étiquette : écart', pbs().some((p) => /règle sans étiquette/.test(p)));
    ecrire(['- **Vues** : pas de requête.', '  *Non mécanisable : relu en revue.*']);
    check('étiquette sur une ligne indentée de la puce : admise', pbs().length === 0);
    ecrire(["- **Vues** : pas de requête. *Non mécanisable en l'état : non outillé.*"]);
    check("« Non mécanisable en l'état : » : admise", pbs().length === 0);
    ecrire([`- **Vues** : pas de requête. *Gardée par : ${garde} (chaînes de \`src/\` seulement)*`]);
    check('dossier cité en précision après le test : pas pris pour un test', pbs().length === 0);
    ecrire(['- **Vues** : pas de requête. *Gardée par : `tests/architecture/Absent.ts::x`*']);
    check('test cité introuvable : écart', pbs().some((p) => /test cité introuvable/.test(p)));
    ecrire(['- **Vues** : pas de requête. *Gardée par : `tests/architecture/CoucheTest.ts::absente`*']);
    check('méthode citée non déclarée : écart', pbs().some((p) => /`absente` non déclarée/.test(p)));
    writeUtf8(path.join(tmp, '.agents/conventions.md'), '# Conventions\n\n## Couches\n\n- **Vues** : pas de requête.\n');
    check('fichier-rôle non déclaré : non contrôlé', checkEtiquettes(tmp).length === 0);
    check('sommaire des règles absent : écart', (checkSommaireRegles(tmp) ?? []).some((p) => /absent/.test(p)));
    writeSommaireRegles(tmp);
    check('sommaire généré : à jour, une ligne par règle', (checkSommaireRegles(tmp) ?? ['x']).length === 0 && /- aucune vue n'interroge la base\. `tests\/architecture\/CoucheTest\.ts::verifie_les_couches`/.test(readUtf8(path.join(tmp, '.agents/regles-architecture.md'))));
    writeUtf8(path.join(tmp, 'tests/architecture/CoucheTest.ts'), "/**\n * Règle : aucune vue n'écrit en base.\n */\nfunction verifie_les_couches() {}\n");
    check('règle modifiée dans le test : sommaire périmé, écart', (checkSommaireRegles(tmp) ?? []).some((p) => /pas à jour/.test(p)));
  } catch (e) {
    failures.push(`exception : ${e.message}`);
  }
  remove(tmp);
  return { count, failures };
}

/**
 * Tolérances des tests d'architecture : dépôt jetable, branche principale `master` puis branche de travail.
 * Une baisse passe ; une hausse, un fichier toléré nouveau, un JSON illisible sont des écarts ; une règle nouvelle part de sa photo.
 */
export function tolerancesCases() {
  const failures = [];
  let count = 0;
  const check = (label, ok) => {
    count++;
    if (!ok) failures.push(label);
  };
  const tmp = path.join(os.tmpdir(), 'workflow-kit-tolerances');
  remove(tmp);
  const g = (...args) => execFileSync('git', ['-C', tmp, '-c', 'user.name=t', '-c', 'user.email=t@t', ...args], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });
  const fichier = 'tests/Feature/Architecture/tolerances/regle.json';
  const ecrire = (rel, obj) => writeUtf8(path.join(tmp, rel), typeof obj === 'string' ? obj : JSON.stringify(obj));
  try {
    fs.mkdirSync(tmp, { recursive: true });
    g('init', '-q', '-b', 'master');
    ecrire(fichier, { 'app/A.php': 2, 'app/B.php': 1 });
    g('add', '-A');
    g('commit', '-q', '-m', 'base');
    g('checkout', '-q', '-b', 'travail');
    check('tolérance inchangée : sans écart, base master', (() => {
      const r = checkTolerances(tmp);
      return r.base === 'master' && r.problems.length === 0;
    })());
    ecrire(fichier, { 'app/A.php': 1 });
    check('tolérance baissée, fichier assaini retiré : sans écart', checkTolerances(tmp).problems.length === 0);
    ecrire(fichier, { 'app/A.php': 3, 'app/B.php': 1 });
    check('tolérance remontée : écart', checkTolerances(tmp).problems.some((p) => /app\/A\.php 2 -> 3/.test(p)));
    ecrire(fichier, { 'app/A.php': 2, 'app/B.php': 1, 'app/C.php': 1 });
    check('fichier toléré nouveau : écart', checkTolerances(tmp).problems.some((p) => /app\/C\.php 0 -> 1/.test(p)));
    ecrire(fichier, { 'app/A.php': 2, 'app/B.php': 1 });
    ecrire('tests/Feature/Architecture/tolerances/nouvelle.json', { 'app/D.php': 5 });
    check('règle nouvelle (absente de la base) : sa photo passe', checkTolerances(tmp).problems.length === 0);
    ecrire(fichier, '{ pas du json');
    check('JSON illisible : écart', checkTolerances(tmp).problems.some((p) => /JSON illisible/.test(p)));
    ecrire(fichier, { 'app/A.php': 2, 'app/B.php': 1 });
    check('base explicite inexistante : rien à comparer', checkTolerances(tmp, 'inexistante').problems.length === 0);
  } catch (e) {
    failures.push(`exception : ${e.message}`);
  }
  remove(tmp);
  return { count, failures };
}

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
    check('quatre copies tenues par le kit (contrôles et formats de la spec et de la référence des utilitaires)', copies.length === 4);
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
    const forme = (p) => p.split(path.sep).join('/').toLowerCase();
    check('worktree retiré (dossier et jonction du kit compris)', !exists(wt) && !forme(g(main, 'worktree', 'list')).includes(forme(wt)));
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

/** Référence des utilitaires minimale au format : deux entrées (deux technos), règle citée. */
function reference({ format = true, body = null } = {}) {
  const head = ['# Référence', '', '> Méthodes réutilisables.', ...(format ? ['> **Format** : `.agents/ecrire-un-utilitaire.md`'] : []), ''];
  const entries = body ?? [
    '## Outils',
    '',
    '### `Calcul`',
    '- **Fichier** : `src/Outils/Calcul.php`',
    '- **Rôle** : calculs de montants.',
    '- **Méthodes** :',
    '  - `arrondir(float $x): float` : arrondi au centime.',
    '  - `TAUX` : constante, sans parenthèses.',
    '- **Utilisé par** : `Facturier`',
    '- **Référence** : `SP-X-01`',
    '',
    '---',
    '',
    '## Interface',
    '',
    '### `formatDate`',
    '- **Fichier** : `src/ui/format.ts`',
    "- **Rôle** : format d'affichage des dates.",
    '- **Méthodes** :',
    '  - `formatDate(d: Date): string` : jour, mois, année ; les durées passent par `Calcul::arrondir()`.',
    '',
  ];
  return [...head, '---', '', ...entries].join('\n');
}

/**
 * Référence des utilitaires (`.agents/ecrire-un-utilitaire.md`) : format déclaré ou non, titres, champs,
 * méthodes citées déclarées dans le code (toute techno), règles citées, style, sommaire à jour ; la copie tourne seule (Node, sans le kit).
 */
export function utilitairesCases(kitRoot) {
  const failures = [];
  let count = 0;
  const tmp = path.join(os.tmpdir(), 'workflow-kit-utilitaires');
  remove(tmp);
  const t = path.join(tmp, 'projet');
  const check = (label, ok) => {
    count++;
    if (!ok) failures.push(label);
  };
  try {
    fs.mkdirSync(t, { recursive: true });
    sync({ kitRoot, target: t, stack: 'laravel-livewire', runtimes: ['opencode'], quiet: true });
    writeUtf8(path.join(t, 'src/Outils/Calcul.php'), '<?php\nclass Calcul {\n    const TAUX = 1;\n    public static function arrondir(float $x): float { return round($x, 2); }\n}\n');
    writeUtf8(path.join(t, 'src/ui/format.ts'), "export function formatDate(d: Date): string {\n  return '';\n}\n");
    writeUtf8(path.join(t, '.agents/specs/spec-parallele.md'), '# Spec\n\n## Entrées\n\n### SP-X-01 — règle\n');
    const ref = path.join(t, '.agents/reference-utilitaires.md');
    const som = path.join(t, '.agents/reference-utilitaires-sommaire.md');
    // Le sommaire suit la référence, sauf `sommaire` explicite (texte, ou null pour l'absence)
    const run = (text, sommaire) => {
      writeUtf8(ref, text);
      if (sommaire === null) remove(som);
      else writeUtf8(som, sommaire ?? buildSommaire(text));
      return checkUtilitairesFile(ref, { root: t });
    };
    const has = (r, re) => r.declared && r.problems.some((p) => re.test(p));

    const seed = checkUtilitairesFile(ref, { root: t });
    check('référence posée par le kit : format déclaré, sans écart', seed?.declared === true && seed.problems.length === 0);
    const ok = run(reference());
    check('référence au format (deux technos, règle citée, renvoi Nom::methode) : sans écart', ok.declared && ok.problems.length === 0);
    check('format non déclaré : contrôle non appliqué', run(reference({ format: false })).declared === false);
    const sansDomaine = run(
      ['# R', '', '> **Format** : `.agents/ecrire-un-utilitaire.md`', '', '---', '', '### `Calcul`', '- **Fichier** : `src/Outils/Calcul.php`', '- **Rôle** : calculs.', ''].join('\n'),
    );
    check('entrée sans titre de domaine : contrôlée', sansDomaine.declared && sansDomaine.problems.length === 0);
    check('méthode supprimée du code : écart', has(run(reference().replace('arrondir(float $x)', 'tronquer(float $x)')), /méthode `tronquer` non déclarée/));
    check('renvoi Nom::methode() vers une méthode absente : écart', has(run(reference().replace('`Calcul::arrondir()`', '`Calcul::absente()`')), /Calcul::absente\(\)` non déclarée/));
    check('entrée en double : écart', has(run(reference() + '\n### `Calcul`\n- **Fichier** : `src/Outils/Calcul.php`\n- **Rôle** : doublon.\n'), /Calcul` » en double/));
    check('champ Rôle absent : écart', has(run(reference().replace('- **Rôle** : calculs de montants.\n', '')), /sans ligne `\*\*Rôle\*\*`/));
    check('fichier cité avec une autre casse : écart', has(run(reference().replace('src/Outils/Calcul.php', 'src/outils/Calcul.php')), /autre casse/));
    check('règle citée absente de la spec : écart', has(run(reference().replace('SP-X-01', 'SP-X-99')), /SP-X-99 cité, absent de la spec parallèle/));
    check('numéro de ligne : écart', has(run(reference().replace('arrondi au centime.', 'arrondi au centime (l.12).')), /numéro de ligne/));
    check('date et accord : écarts', has(run(reference().replace('arrondi au centime.', 'arrondi (ajouté le 2026-01-01, accord utilisateur).')), /date/) && has(run(reference().replace('arrondi au centime.', 'arrondi, accord utilisateur.')), /accord utilisateur/));
    check('Rôle de plus de 120 caractères : écart', has(run(reference().replace('calculs de montants.', `calculs ${'x'.repeat(120)}.`)), /Rôle de « `Calcul` » : \d+ caractères \(120 au plus/));
    const sommaire = buildSommaire(reference());
    check('sommaire : une ligne par entrée, sous son domaine', /## Outils\n\n- `Calcul` : calculs de montants\.\n\n## Interface\n\n- `formatDate` : format d'affichage des dates\./.test(sommaire));
    check('sommaire pas à jour : écart', has(run(reference().replace('calculs de montants.', 'calculs des montants.'), sommaire), /sommaire\.md pas à jour/));
    check('sommaire absent : écart', has(run(reference(), null), /sommaire\.md absent/));
    check('sommaire en CRLF : à jour', run(reference(), sommaire.replace(/\n/g, '\r\n')).problems.length === 0);
    check('ligne trop longue : écart', has(run(reference().replace('arrondi au centime.', `arrondi ${'x'.repeat(320)}.`)), /caractères \(300 au plus\)/));
    // Format fermé : champs de la liste, une fois, dans l'ordre ; aucune ligne hors gabarit
    const apresUtilise = (ligne) => reference().replace('- **Utilisé par** : `Facturier`', `- **Utilisé par** : \`Facturier\`\n${ligne}`);
    check('format fermé : champ hors liste (Piège) : écart', has(run(apresUtilise('- **Piège** : effet de bord.')), /champ « Piège » hors du format/));
    check('format fermé : champ hors liste (Ne pas réécrire) : écart', has(run(apresUtilise('- **Ne pas réécrire** : seul arrondi.')), /champ « Ne pas réécrire » hors du format/));
    check("format fermé : champ hors d'ordre : écart", has(run(apresUtilise('- **Type** : outil')), /champ « Type » hors d'ordre/));
    check('format fermé : champ en double : écart', has(run(apresUtilise('- **Utilisé par** : `Autre`')), /champ « Utilisé par » en double/));
    check('format fermé : ligne hors gabarit : écart', has(run(apresUtilise('Texte libre sous l’entrée.')), /ligne hors gabarit dans l'entrée « `Calcul` »/));
    check('format fermé : variantes Fichiers et sans accent admises', run(reference().replace('- **Fichier** :', '- **Fichiers** :').replace('- **Rôle** : calculs', '- **Role** : calculs')).problems.length === 0);

    // Contrôle autonome : la copie seule, lancée par Node depuis le projet, sans le kit
    const copie = path.join(t, '.agents/verifier-utilitaires.mjs');
    const lancer = (text, args = []) => {
      writeUtf8(ref, text);
      try {
        return { code: 0, out: execFileSync(process.execPath, [copie, ...args], { cwd: t, encoding: 'utf8' }) };
      } catch (e) {
        return { code: e.status, out: `${e.stdout ?? ''}` };
      }
    };
    const seule = lancer(reference());
    check('copie autonome, référence au format : ok, code 0', seule.code === 0 && /\[ok\]/.test(seule.out));
    const fausse = lancer(reference().replace('arrondir(float $x)', 'tronquer(float $x)'));
    check('copie autonome, méthode absente : écart, code 1', fausse.code === 1 && /tronquer/.test(fausse.out));
    remove(som);
    const regen = lancer(reference().replace('calculs de montants.', 'calculs régénérés.'), ['--sommaire']);
    check('copie autonome, --sommaire : sommaire régénéré, ok', regen.code === 0 && /régénéré/.test(regen.out) && fs.readFileSync(som, 'utf8').includes('calculs régénérés.'));
  } catch (e) {
    failures.push(`exception : ${e.message}`);
  }
  remove(tmp);
  return { count, failures };
}
