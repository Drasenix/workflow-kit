# Règles d'écriture des tests (Jest)

> **Statut : DÉFAUT PACK** — la règle binaire générique (unitaire vs intégration) vit dans `core/agents/test.md` ; détails de la stack ci-dessous.

## Périmètre du TDD

- **Oui** (logique métier) : parser, validators, adapters, engines, services, **utils** (fonctions pures).
- **Non** (frontend) : composants React, hooks UI, contexts — pas de TDD obligatoire.

## Framework et config

- **Jest** + **jsdom**, transform `ts-jest` pointant sur `tsconfig.renderer.json` (`jest.config.js`).
- Fichiers : `*.test.ts` / `*.test.tsx` à côté du code ou dans `tests/`.
- Mocks nécessaires pour le main process : `electron`, `better-sqlite3`.

## Structure

- Blocs `describe('#nomDeFonction')`, pattern **Given / When / Then**.
- Une assertion principale par test ; messages explicites.

## Exécution

- **Ciblé** (subagents `@test` / `@dev`) : `npx jest --runInBand <fichier|pattern>`.
- **Global** (Build uniquement, fin de workflow) : `npm test`.
- Détails et format de rapport : `.agents/skills/tests/SKILL.md`.
