# Conventions (Laravel 12 + Livewire 3)

> **Statut : DÉFAUT PACK** — convention techno applicable par défaut ; le projet peut la spécialiser en `DÉCISION PROJET`.
>
> Conventions **techno** du pack `laravel-livewire`. Aucune entité ni structure métier ici :
> celles-ci vivent côté projet (`.agents/domain-glossary.md`, `.agents/architecture.md`).

## Langue

- Code et identifiants : **anglais** (classes, méthodes, variables standard Laravel).
- Sauf convention projet contraire, noms de tables/colonnes et libellés UI : langue du domaine.
- Commentaires et documentation : langue de l'équipe.

## Organisation de la logique

| Type | Emplacement | Quand l'utiliser |
|---|---|---|
| **Action** | `app/Actions/` | Unité de logique métier exécutable, 1 responsabilité, méthode `execute()` ou `handle()`. Préférée pour toute opération non triviale. |
| **Service** | `app/Services/` | Encapsulation d'une intégration externe ou d'un comportement transverse. |
| **DTO** | `app/DTO/` | Transfert typé entre couches, pour éviter les tableaux associatifs opaques. |
| **Enum** | `app/Enums/<Domaine>/` | Toute valeur énumérée (types, statuts). |
| **Job** | `app/Jobs/` | Traitement asynchrone (queue `database`). |
| **Listener** | `app/Listeners/` | Réponse à un event Laravel. |
| **Livewire** | `app/Livewire/<Domaine>/` | Composant UI réactif. |

### Règles

- **Pas de logique métier dans un contrôleur.** Le contrôleur valide, délègue à une Action/Service, renvoie la réponse.
- **Pas de requêtes Eloquent directes dans Blade / vue Livewire.** Charger en amont (`with`, computed properties).
- **Éviter les N+1.** Utiliser `with()` pour les relations.
- **Mass assignment** : toujours protéger avec `$fillable` ou `$guarded`.
- **Transactions** : envelopper toute opération multi-écritures dans `DB::transaction()`.

## Modèles et migrations

- **Ne jamais modifier une migration existante** déjà exécutée. Créer une nouvelle migration (`add_<truc>_to_<table>_table`, `drop_<truc>_from_<table>_table`).
- Timestamps Laravel standards (`created_at`, `updated_at`). `softDeletes` uniquement si nécessaire.
- Les clés étrangères et contraintes suivent les conventions Laravel sauf règle projet explicite.

## Livewire 3

- Props : `#[Url]` pour les filtres synchronisés avec l'URL.
- Computed : `#[Computed]` pour les dérivés coûteux.
- Events : `#[On('event-name')]` pour réagir.
- `wire:model.live` à utiliser avec parcimonie (préférer `.blur`/`.debounce` ou `.lazy` pour les inputs textuels).
- Lifecycle : `mount()` pour l'init, `boot()` pour l'injection, `hydrate()`/`dehydrate()` seulement si nécessaire.

## Style et qualité

- **Formatter PHP** : Laravel Pint (defaults Laravel, pas de config custom). Lancer `./vendor/bin/pint` après toute modification PHP significative, ou cibler un chemin : `./vendor/bin/pint app/Actions/MaAction.php`.
- **Pas de linter JS** par défaut. Garder un style cohérent avec l'existant dans `resources/js/`.
- **Tests** : PHPUnit (pas Pest). Feature tests dans `tests/Feature/`, Unit dans `tests/Unit/`. Voir `.agents/test-rules.md` et `.agents/skills/tests/SKILL.md`.

## Gestion des secrets

- Jamais de secret committé. Tout passe par `.env` (gitignored).
- `.env.example` est la référence — ne pas y mettre de vraies valeurs.
- Ajout d'une variable d'env : l'ajouter à `.env.example` avec l'accord explicite de l'utilisateur.
