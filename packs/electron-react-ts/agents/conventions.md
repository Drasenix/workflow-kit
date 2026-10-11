# Conventions (Electron + React + TypeScript)

> **Statut : DÉFAUT PACK** — convention techno applicable par défaut ; le projet peut la spécialiser en `DÉCISION PROJET`.
>
> Conventions **techno** du pack `electron-react-ts`. Aucune entité ni structure métier ici :
> celles-ci vivent côté projet (`.agents/domain-glossary.md`, `.agents/architecture.md`).

## Langue

- Code et identifiants : **anglais** (types, fonctions, variables, fichiers).
- Commentaires et documentation : langue de l'équipe.
- **Pas de commentaires dans le code** : le code se documente par ses noms.

## Organisation de la logique

| Type | Emplacement | Quand l'utiliser |
|---|---|---|
| **DTO** | `shared/models/*-dto.ts` | Forme des données échangées main ↔ renderer (IPC). |
| **Adapter** | `features/<domaine>/adapters/*-adapter.ts` | Mapping DTO (main) ↔ modèle (renderer). |
| **Service** | `features/<domaine>/services/*-service.ts` | Appel IPC, accès données. |
| **Facade** | `features/<domaine>/facade/*-facade.ts` | API publique du domaine (seule couche appelée par l'UI). |
| **Engine** | `features/<domaine>/engine/*-engine.ts` | Logique métier pure (singleton si état partagé). |
| **Utils** | `features/<domaine>/utils/*.ts` | Fonctions pures testables. |
| **Modèle** | `features/<domaine>/models/*-model.ts` | Types du domaine côté renderer. |

### Règles

- **Feature-sliced** : chaque domaine suit `models/adapters/services/facade/engine/hooks/contexts/components/utils`.
- Les composants n'appellent que les **facades**, jamais les services directement.
- **Validation** des données côté main **et** côté renderer.
- Features logicielles pures (engine, utils, adapters, services) → **TDD**.

## Contraintes de code

- **Pas de `for...of`** ; utiliser `.forEach()`.
- **Pas d'implicit `any`** : type explicite partout.
- **Pas d'index comme `key` React** : utiliser un ID stable.
- **Pas d'`eslint-disable`** ni de `// eslint-disable-next-line`.
- `catch (error: unknown)` puis narrowing via `instanceof Error`.
- **Immutabilité** : toujours une nouvelle référence pour tableaux/objets.
- Pas de `useEffect` pour du calcul dérivable → `useMemo`.

## Nommage des fichiers

- Suffixes stricts : `*-dto.ts`, `*-facade.ts`, `*-adapter.ts`, `*-engine.ts`, `*-service.ts`, `*-model.ts`.
- Composants React : `PascalCase.tsx`.

## Style et qualité

- **Formatter** : Prettier (`singleQuote: true`) — cf. `package.json`.
- **Linter** : ESLint (`eslint-config-erb`).
- **Tests** : Jest + jsdom — cf. `.agents/test-rules.md`.
