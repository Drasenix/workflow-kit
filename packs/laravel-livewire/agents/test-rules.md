# Règles d'écriture des tests (Laravel + PHPUnit)

> **Statut : DÉFAUT PACK** — convention techno applicable par défaut ; le projet peut la spécialiser en `DÉCISION PROJET`.
>
> Détails **techno** des tests. La règle binaire générique (unitaire vs intégration) vit dans
> `core/agents/test.md` ; ce fichier la décline pour PHPUnit / Laravel.

## Dossiers et classes de base

| Catégorie | Dossier | Base class | Traits |
|---|---|---|---|
| Test unitaire (TU) | `tests/Unit/<Domaine>/` | `PHPUnit\Framework\TestCase` | aucun container Laravel |
| Test d'intégration (TI) | `tests/Feature/<Domaine>/` | `Tests\TestCase` | `RefreshDatabase` + `$seed = true` |

Templates : `templates/tests/unit-test.php` (TU), `templates/tests/test.php` (TI) : voir `.agents/templates-index.md`.

## Garde-fous TU

Un fichier `tests/Unit/` ne doit **jamais** contenir : `RefreshDatabase`, `$seed`, `assertDatabaseHas`, `assertDatabaseMissing`, `$model->refresh()`, `$model->fresh()`, `factory()`, `DB::transaction()`. Sinon il est mal classé : le déplacer dans `tests/Feature/`.

## Garde-fou TI

Un fichier `tests/Feature/` qui ne contient **ni** `assertDatabaseHas` / `assertDatabaseMissing` **ni** `->refresh()` / `->fresh()` **ni** `DB::transaction()` / `factory()->create()` est un TU déguisé : vérifier avant de classer.

## Nommage

- **Fichier / classe** : `<Feature>Test` — le nom décrit le **comportement métier** de la feature, **sans** identifiant de lot (`F0`, `F1`, `lot1`…) ni nom de chantier (retours de démo, réunion…), en préfixe ni dans le nom.
- **Méthodes** : `test_<comportement>` en français, d'après le comportement décrit par le scénario. **Aucun** identifiant de scénario (`B1`, `E1`…) dans le nom — ce sont des repères internes au feature file.
- La traçabilité test ↔ scénario se fait par le **libellé du scénario**, jamais par un identifiant recopié dans le nom du test.

## Config de test

`phpunit.xml` : SQLite en mémoire, queue `sync`, mail `array`, cache `array`.

## Vérification anti-doublon

Pour chaque scénario, avant d'écrire un test :

```
rg -n "NomDeLaClasse|NomDeLaMethode" tests/ --glob "*Test.php"
```

Si la couverture existe déjà, ne pas réécrire et marquer `⏭️ déjà couvert par <Test>` dans le fichier de feature.

## Tests d'architecture

Une convention du projet devient un **test** quand elle est mécanisable : il dit non avant la revue. Ils testent la **structure** du code (où une valeur s'écrit, quelle couche appelle quoi), pas un comportement.

- **Où** : `tests/Feature/Architecture/`, une classe par règle ou par famille, qui étend `ArchitectureTestCase` (template : `templates/tests/architecture/RegleTest.php`).
- **Copies tenues par le kit** : `ArchitectureTestCase.php` et les règles génériques de `tests/Feature/Architecture/Kit/` (structure : statut en tableau, transaction manuelle, Action statique, service locator, Job utilisé comme service, taille de fichier, Calculator et Query qui écrivent) sont posées par `workflow-kit sync` et réécrites à chaque synchronisation : ne jamais les modifier dans le projet. Leurs tolérances restent au projet ; une exception permanente propre au projet va dans `exceptions-projet.php`, à créer au besoin à côté de la base dans `tests/Feature/Architecture/` (`return ['<regle>' => ['<chemin>' => '<raison>']];`).
- **Ligne `Règle :`** : le docblock de chaque méthode commence par `Règle : <la convention en une phrase>`. Le sommaire des règles est généré à partir de ces lignes.
- **Correction** : `assertRegleRespectee(…, correction: '<ce qu'il faut faire à la place, avec le modèle à copier>')`. Le message d'échec guide l'agent vers la bonne forme ; « interdit » seul ne suffit pas.
- **Listes calculées, jamais recopiées** : un littéral interdit vient de sa source de vérité (table de référence en base de test, cas d'une énumération, dossiers), lue par le test à chaque exécution.
- **Exceptions** : choix assumés et permanents, écrits dans le test avec leur raison (`'app/<Dossier>/' => '<raison>'`).
- **Tolérances** : la dette existante, dans `tests/Feature/Architecture/tolerances/<regle>.json` (fichier => occurrences). Le test échoue si un fichier dépasse sa tolérance, **et** si un fichier assaini ne la baisse pas (cliquet). Une tolérance ne remonte jamais : `node workflow-kit/bin/workflow-kit.mjs check-meta --tolerances` compare à la branche principale.
- **Tolérance initiale** : à la création d'une règle seulement, `ARCHITECTURE_GENERER_TOLERANCES=1 php artisan test tests/Feature/Architecture/<Regle>Test.php` écrit la photo de l'existant. Jamais pour faire passer un test rouge.
- **Quand baisser** : une feature qui touche un fichier toléré et couvert par des tests le migre, puis baisse sa tolérance.

## Scaffolding interdit

Aucune ligne de séparation, aucun commentaire de workflow (`// Tests baseline`, `// Helpers`), aucune parenthèse de statut TDD (`(doivent passer au vert)`). Le fichier est propre dès l'écriture.
