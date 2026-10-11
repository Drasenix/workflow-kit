---
name: "tests"
description: "Exécution des tests Jest : run ciblé (fichier/pattern, --runInBand), test global, format de rapport. À charger avant tout `jest`/`npm test`."
---

# tests

Charger cette skill avant de lancer Jest (ciblé ou global) — pour choisir la bonne commande et le bon format de rapport.

## Commandes

```bash
# Ciblé par fichier
npx jest --runInBand path/to/file.test.ts

# Ciblé par motif de nom
npx jest --runInBand pattern

# Test global (Build uniquement, fin de workflow)
npm test
```

Config : `jest.config.js` (ts-jest → `tsconfig.renderer.json`, environnement `jsdom`).

## Règles d'exécution

- **Runs ciblés des subagents (`@test`, `@dev`)** : fichier/pattern + `--runInBand` (sans parallélisme).
- **Le global, c'est `npm test`** — réservé au Build, en fin de workflow, après le gate « Progression entièrement ✅ ». Interdit en cours d'itération.

## Mocks main process

Pour tester du code `src/main/`, mocker `electron` et `better-sqlite3`.

## Format de rapport

Rapporter uniquement :

1. Le résumé final (nombre de suites/tests, durée).
2. Les échecs avec le message d'erreur et la localisation.

Ne pas recopier tout le stdout si tout passe — juste confirmer `PASS`.
