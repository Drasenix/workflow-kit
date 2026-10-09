# Commandes du workflow

> Chargé en contexte à chaque session (opencode : `instructions` de `opencode.json` ; Claude Code : import dans `CLAUDE.md`). Les fichiers `core/` y référencent
> les commandes du projet (aucune lecture nécessaire).

- **test ciblé** : `php artisan test --filter=<Filter>`
- **test global** : `php artisan test --parallel`
- **format** : `./vendor/bin/pint`
- **fallback** : `docker compose exec -T app`
