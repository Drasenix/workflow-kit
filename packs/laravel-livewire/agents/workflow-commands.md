# Commandes du workflow

> Chargé en contexte via `opencode.json` (`instructions`). Les fichiers `core/` y référencent
> les commandes du projet (aucune lecture nécessaire).

- **test ciblé** : `php artisan test --filter=<Filter>`
- **test global** : `php artisan test --parallel`
- **format** : `./vendor/bin/pint`
- **fallback** : `docker compose exec -T app`
