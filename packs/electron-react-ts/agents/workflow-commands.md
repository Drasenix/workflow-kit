# Commandes du workflow

> Chargé en contexte à chaque session (opencode : `instructions` de `opencode.json` ; Claude Code : import dans `CLAUDE.md`). Les fichiers `core/` y référencent
> les commandes du projet (aucune lecture nécessaire).

- **test ciblé** : `npx jest --runInBand <fichier|pattern>`
- **test global** : `npm test`
- **format** : `npx prettier --write <fichiers>`
- **fallback** : aucun (commandes exécutables localement)
