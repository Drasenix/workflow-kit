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

- **Fichier / classe** : `<Feature>Test` — le nom décrit la **feature**, **sans** identifiant de lot (`F0`, `F1`, `lot1`…) en préfixe ni dans le nom.
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

## Scaffolding interdit

Aucune ligne de séparation, aucun commentaire de workflow (`// Tests baseline`, `// Helpers`), aucune parenthèse de statut TDD (`(doivent passer au vert)`). Le fichier est propre dès l'écriture.
