# Stack (socle Laravel 12 + Livewire 3)

> Socle **générique** du pack. **Source de vérité : `composer.json` et `package.json` du projet.**
> Ce document résume les dépendances attendues ; à ajuster selon les versions réellement installées.

## Runtime

- **PHP** : ^8.2
- **Node** : 20+
- **Base de données** : dev local SQLite (`database/database.sqlite`) par défaut, sauf config projet.

## Backend (require)

| Package | Version | Rôle |
|---|---|---|
| `laravel/framework` | ^12.0 | Framework principal |
| `livewire/livewire` | ^3.7 | Composants UI réactifs |
| `laravel/fortify` | ^1.32 | Scaffolding auth (login, 2FA) — selon le projet |
| `laravel/tinker` | ^2.10 | REPL |

## Backend (require-dev)

| Package | Version | Rôle |
|---|---|---|
| `laravel/pint` | ^1.13 | Formatter PHP |
| `phpunit/phpunit` | ^11.5 | Tests |
| `brianium/paratest` | ^7.8 | Tests parallèles |
| `nunomaduro/collision` | ^8.6 | Affichage des erreurs CLI |
| `fakerphp/faker` | ^1.23 | Données de test |
| `laravel/pail` | ^1.2 | Logs temps réel |
| `laravel-lang/lang` | ^15.26 | Traductions (selon le projet) |

## Frontend

| Package | Version | Rôle |
|---|---|---|
| `vite` | ^6.0 | Bundler |
| `laravel-vite-plugin` | ^1.2 | Intégration Laravel |
| `@tailwindcss/vite` | ^4.0 | Tailwind via Vite |
| `tailwindcss` | ^4.0 | CSS utilitaire |
| `daisyui` | ^5.5 | Composants UI Tailwind |
| `axios` | ^1.7 | Client HTTP |

## Dépendances optionnelles (opt-in)

Ces packages ne sont **pas** acquis : à installer uniquement si le projet en a besoin, et à documenter dans `composer.json`/`package.json`.

- API : `laravel/sanctum`, `darkaonline/l5-swagger`.
- Exports : `maatwebsite/excel`.
- PDF / rendu headless : `spatie/browsershot` (+ `puppeteer` côté Node).
- Médias / audit / permissions : `spatie/laravel-medialibrary`, `spatie/laravel-activitylog`, `spatie/laravel-permission`.
- Paiements : installer le SDK de la passerelle choisie par le projet.
