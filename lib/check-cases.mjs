import path from 'node:path';
import { readUtf8 } from './util.mjs';
import { checkFeature } from './check.mjs';

/** Écarts produits par les contrôles du gabarit à deux phases (les seuls que ces cas examinent). */
const TWO_PHASE = /Contexte technique|Arbitrages du challenge|Arbre de flux|Fichiers à créer|Écarts au plan|Décisions techniques|écart du challenge|décision technique/;

const ARBITRAGES_VIDE = '| # | Cible | Écart | Arbitrage | Répercuté dans |\n|---|---|---|---|---|\n| | | | | |';
const DECISIONS_VIDE = '| # | Objet | Décision proposée | Raison |\n|---|---|---|---|\n| | | | |';

/** Étapes 0..upTo marquées faites dans la Progression du gabarit. */
const withSteps = (text, upTo) =>
  text.replace(/^\| (\d) \| ([^|]+) \| ([^|]+) \| ⬜ \|/gm, (m, n, a, b) => (Number(n) <= upTo ? `| ${n} | ${a} | ${b} | OK 2026-01-01 |` : m));

/** Remplacements exacts dans le gabarit ; un texte absent lève une erreur (le gabarit a changé : cas à mettre à jour). */
const fill = (text, pairs) =>
  pairs.reduce((t, [from, to]) => {
    if (!t.includes(from)) throw new Error(`gabarit : texte attendu introuvable « ${from.slice(0, 50).replace(/\n/g, '⏎')} »`);
    return t.replace(from, to);
  }, text);

/**
 * Cas de référence des contrôles du gabarit à deux phases : chaque cas part du gabarit de feature,
 * le remplit jusqu'à une étape, et attend exactement les écarts listés (aucun autre écart de ces contrôles).
 * Renvoie `{ count, failures }` : nombre de cas joués, et cas en échec (`cas — raison`).
 */
export function checkCases(kitRoot) {
  const tpl = readUtf8(path.join(kitRoot, 'core/templates/feature.md'));
  const cases = [];
  try {
    const dor = fill(withSteps(tpl, 1), [
      ["- **Point d'entrée** : ", "- **Point d'entrée** : `Foo::bar()` — src/Foo:12"],
      [ARBITRAGES_VIDE, '| # | Cible | Écart | Arbitrage | Répercuté dans |\n|---|---|---|---|---|\n| 1 | E2 | tri | | |\n| 2 | EC-3 | nul | EC-4 ajouté | EC-4 |'],
    ]);
    const arbitre = dor.replace('| 1 | E2 | tri | | |', '| 1 | E2 | tri | refusé : hors périmètre | Registre |');
    const plan = fill(withSteps(arbitre, 3), [
      ["### Arbre de flux\n\n> L'arbre", "### Arbre de flux\n\n```\nGET /x\n  └─> Foo\n```\n\n> L'arbre"],
      ['| Fichier | Type | Rôle |\n|---------|------|------|\n| | | |', '| Fichier | Type | Rôle |\n|---------|------|------|\n| src/Foo | modifié | garde |'],
    ]);
    const code = fill(withSteps(plan, 4), [['Porter `Aucun` si le code suit le plan.\n\n- ', 'Porter `Aucun` si le code suit le plan.\n\n- Aucun']]);
    const ancien = fill(withSteps(tpl, 5), [
      [/## Contexte technique[\s\S]*?(?=## Clé de lecture)/.exec(tpl)[0], ''],
      [/## Arbitrages du challenge[\s\S]*?(?=## Conventions)/.exec(tpl)[0], ''],
      ['## Plan (étape 3)', '## Architecture (étape 3)'],
      [/### Décisions techniques[\s\S]*?(?=### Questions)/.exec(tpl)[0], ''],
    ]);
    cases.push(
      ['étape 0 en cours : rien de contrôlé', tpl.replace('| 0 | Compréhension (specs + code) | raffineur | ⬜ |', '| 0 | Compréhension (specs + code) | raffineur | 🔄 |'), []],
      ['jalon 1→2, sections vides', withSteps(tpl, 1), [/« Contexte technique » vide/, /« Arbitrages du challenge » vide/]],
      ['jalon 1→2, un écart non arbitré', dor, [/écart du challenge non arbitré \(1\)/]],
      ['jalon 1→2, écarts arbitrés', arbitre, []],
      ['jalon 1→2, « Aucun écart »', fill(withSteps(tpl, 1), [["- **Point d'entrée** : ", "- **Point d'entrée** : x"], [ARBITRAGES_VIDE, 'Aucun écart']]), []],
      ['étape 3 faite, plan vide', withSteps(arbitre, 3), [/« Arbre de flux » vide/, /« Fichiers à créer \/ modifier » vide/]],
      ['étape 3 faite, plan rempli (arbre en bloc de code)', plan, []],
      ['étape 4 faite, écarts au plan vides', withSteps(plan, 4), [/« Écarts au plan » vide/]],
      ['étape 4 faite, « Aucun » écart', code, []],
      ['étape 5 faite, décisions techniques vides', withSteps(code, 5), [/« Décisions techniques » vide/]],
      ['étape 5 faite, décision sans proposition', fill(withSteps(code, 5), [[DECISIONS_VIDE, '| # | Objet | Décision proposée | Raison |\n|---|---|---|---|\n| T1 | `Foo::bar()` | | |']]), [/décision technique sans décision proposée/]],
      ['étape 5 faite, « Aucune » décision', fill(withSteps(code, 5), [[DECISIONS_VIDE, 'Aucune']]), []],
      ['gabarit antérieur (sections absentes), étape 5 faite', ancien, []],
    );
  } catch (e) {
    return { count: 0, failures: [`préparation des cas — ${e.message}`] };
  }

  const failures = [];
  for (const [label, text, expected] of cases) {
    const got = checkFeature(text, { name: 'cas.md' }).problems.filter((p) => TWO_PHASE.test(p));
    const missing = expected.filter((re) => !got.some((p) => re.test(p)));
    const extra = got.filter((p) => !expected.some((re) => re.test(p)));
    if (missing.length) failures.push(`${label} — écart attendu non signalé : ${missing.map(String).join(', ')}`);
    if (extra.length) failures.push(`${label} — écart inattendu : ${extra.join(' ; ')}`);
  }
  return { count: cases.length, failures };
}
