# Commandes utiles (Electron + React + TypeScript)

> Renseigner les vraies commandes du projet si elles diffèrent. Le sous-ensemble toujours chargé
> en contexte est `.agents/workflow-commands.md`.

## Dev

```bash
npm start          # dev complet (webpack + electronmon)
```

## Build / package

```bash
npm run build      # build production (main + renderer)
npm run package    # packaging electron-builder
```

## Tests

```bash
npm test                              # tous les tests (jest)
npx jest --runInBand <fichier|pattern> # test ciblé
npx jest --watch <fichier|pattern>     # watch ciblé
```

Config : `jest.config.js`, transformation `ts-jest` avec `tsconfig.renderer.json`, environnement `jsdom`.

## Lint / format

```bash
npm run lint           # eslint
npm run lint:fix       # eslint --fix
npx prettier --write <fichiers>   # format ciblé
```

## Typecheck

```bash
npm run typecheck      # tsc -p tsconfig.renderer.json && tsc -p tsconfig.main.json
```

## Base de données

```bash
# SQLite (better-sqlite3) — migrations gérées dans src/main/db/
```
