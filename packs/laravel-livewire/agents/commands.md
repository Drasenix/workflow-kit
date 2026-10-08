# Commandes utiles (Laravel + Livewire)

> Renseigner les vraies commandes du projet si elles diffèrent. Le sous-ensemble toujours chargé
> en contexte est `.agents/workflow-commands.md`.

## Environnement d'exécution — fallback Docker

Les commandes ci-dessous supposent PHP accessible localement. **Si `php` ne semble pas accessible** (command not found, erreur d'environnement), **utiliser directement Docker** sans déboguer le local :

```bash
docker compose exec -T app php artisan test --filter=NomDuTest
docker compose exec -T app php artisan migrate
docker compose exec -T app ./vendor/bin/pint app/MonFichier.php
docker compose exec -T app composer install
```

## Dev local (sans Docker)

```bash
# Stack complète (artisan serve + queue + pail + vite en parallèle)
composer dev

# Ou individuellement
php artisan serve
php artisan queue:listen --tries=1
php artisan pail --timeout=0
npm run dev
```

## Install / setup

```bash
composer install
npm install
php artisan key:generate
php artisan migrate
```

## Tests

```bash
# Tous les tests
php artisan test

# Filtré par nom / fichier
php artisan test --filter=NomDuTest
php artisan test tests/Feature/MaFonctionnaliteTest.php

# Directement via PHPUnit
./vendor/bin/phpunit
./vendor/bin/phpunit --filter=NomDuTest
```

Config de test (cf. `phpunit.xml`) : SQLite en mémoire, queue `sync`, mail `array`, cache `array`.

### Exécution parallèle (ParaTest)

```bash
php artisan test --parallel

# Docker (toujours -T en script/CI)
docker compose exec -T app php artisan test --parallel
```

Méthode de calibrage (`--processes=N`), pièges Docker et format de rapport : `.agents/skills/tests/SKILL.md`.

## Lint / format PHP

```bash
# Tout le projet
./vendor/bin/pint

# Ciblé
./vendor/bin/pint app/Actions/MaAction.php
./vendor/bin/pint app/Livewire/

# Dry-run
./vendor/bin/pint --test
```

## Build frontend

```bash
npm run build       # build prod (vers public/build/)
npm run dev         # dev server Vite avec HMR
```

## Base de données

```bash
php artisan migrate                 # applique les migrations en attente
php artisan migrate:status          # état des migrations
php artisan migrate:rollback        # rollback dernier batch
php artisan migrate:fresh           # drop toutes les tables puis migre (DESTRUCTIF)
php artisan migrate:fresh --seed    # idem + seeders (DESTRUCTIF)
php artisan db:seed                 # lance les seeders
```

## Artisan courant

```bash
php artisan tinker                  # REPL
php artisan route:list              # toutes les routes
php artisan make:controller Foo
php artisan make:model Xxx -mfs     # migration + factory + seeder
php artisan make:livewire Xxx       # composant Livewire
php artisan make:action Foo         # si un generator est disponible, sinon manuel
php artisan queue:work --tries=3    # worker prod
php artisan schedule:run            # lancer le scheduler (cron 1x/min)
```

## Cache

```bash
php artisan optimize                # cache config+route+view (prod)
php artisan optimize:clear          # purge tous les caches
php artisan config:clear
php artisan route:clear
php artisan view:clear
```

## Git helpers

```bash
git log --oneline -20               # historique court
git diff HEAD                       # changements depuis le dernier commit
git status
```
