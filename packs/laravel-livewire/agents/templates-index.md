# Index des templates

> **Statut : DÉFAUT PACK** — scaffolds **techno** uniquement (structure de code, tests). Les **vues / composants UI** ne sont **pas** fournis par le pack : ils relèvent du **design system du projet** (`DÉCISION PROJET`) — voir `.agents/ui-rules.md`.
>
> Consulté par l'agent Build en début de feature. Chaque agent copie le template correspondant et remplace les marqueurs (`<Domaine>`, `<Nom>`, etc.) avant d'écrire du code.
> **Un seul fichier de test par feature** : scénarios baseline et évolution dans la même classe (`<Feature>Test.php`) — jamais deux fichiers séparés.
> **Nommage** : la classe/le fichier porte le nom de la **feature** (sans identifiant de lot `F0`/`F1`…) ; les méthodes sont préfixées `test_` et décrivent le **comportement** (sans identifiant de scénario `B1`/`E1`).

## Livewire — classe (`templates/frontend/`)

| J'ai besoin de… | Template | Agent concerné |
|---|---|---|
| Un composant Livewire (classe PHP) | `templates/frontend/livewire-component.php` | `@dev` |

> Les **vues Blade** (page, vue Livewire, champs, fragments…) ne sont **pas** seedées : elles appartiennent au projet (design system / composants `x-ui`).

## Backend (`templates/backend/`)

| J'ai besoin de… | Template | Agent concerné |
|---|---|---|
| Un DTO typé | `templates/backend/dto.php` | `@dev` |
| Une Action statique | `templates/backend/action.php` | `@dev` |
| Un Event | `templates/backend/event.php` | `@dev` |
| Un Listener | `templates/backend/listener.php` | `@dev` |
| Un export Excel/CSV (si `maatwebsite/excel` installé) | `templates/backend/excel-export.php` | `@dev` |

## Tests (`templates/tests/`)

| J'ai besoin de… | Template | Agent concerné |
|---|---|---|
| Un test unitaire (règles métier pures, sans DB) | `templates/tests/unit-test.php` | `@test` |
| Un test d'intégration (DB, RefreshDatabase, seed) | `templates/tests/test.php` | `@test` |

## Feature

| J'ai besoin de… | Template | Agent concerné |
|---|---|---|
| Une feature complète (spéc + GWT + archi + dev) | `.opencode/templates/feature.md` | `@specs`, `@architect` |

## Marqueurs remplaçables

| Marqueur | À remplacer par | Exemple |
|---|---|---|
| `<Domaine>` | Sous-dossier du domaine (PascalCase) | `MonDomaine`, `Facturation` |
| `<Nom>` | Nom de la classe | `CreerElement`, `BandeauListe` |
| `<Service>` | Service injecté | `MonService` |
| `<Model>` | Modèle Eloquent | `MonModel` |
| `<Param>` | Type du paramètre d'Action | `MonModel`, `int` |
| `<Return>` | Type de retour d'Action | `array`, `void`, `bool` |
