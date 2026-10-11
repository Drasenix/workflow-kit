# Index des templates (Electron + React + TypeScript)

> **Statut : DÉFAUT PACK** — scaffolds **techno** uniquement (structure de code). Les **composants UI** ne sont **pas** fournis par le pack : ils relèvent du design system du projet (`DÉCISION PROJET`) — voir `.agents/ui-rules.md` et `.agents/component-rules.md`.
>
> Consulté par l'agent Build en début de feature. Chaque agent copie le template correspondant et remplace les marqueurs (`<Nom>`, `<nom>`, etc.) avant d'écrire du code.

## Shared (`templates/shared/`)

| J'ai besoin de… | Template | Agent concerné |
|---|---|---|
| Un DTO (forme échangée par IPC) | `templates/shared/dto.ts` | `@dev` |

## Renderer (`templates/renderer/`)

| J'ai besoin de… | Template | Agent concerné |
|---|---|---|
| Un modèle de domaine | `templates/renderer/model.ts` | `@dev` |
| Un adapter DTO → modèle | `templates/renderer/adapter.ts` | `@dev` |
| Un service (appels IPC) | `templates/renderer/service.ts` | `@dev` |
| Une facade (API publique du domaine) | `templates/renderer/facade.ts` | `@dev` |
| Un engine singleton | `templates/renderer/engine.ts` | `@dev` |
| Un validator pur (`string[]`) | `templates/renderer/validator.ts` | `@dev`, `@test` |

## Main (`templates/main/`)

| J'ai besoin de… | Template | Agent concerné |
|---|---|---|
| Un repository SQLite (CRUD) | `templates/main/repository.ts` | `@dev` |
| Une migration | `templates/main/migration.ts` | `@dev` |
| Un service main « thin » | `templates/main/service.ts` | `@dev` |
| Un handler IPC (+ ajout de canal) | `templates/main/ipc-handler.ts` | `@dev` |

## Feature

| J'ai besoin de… | Template | Agent concerné |
|---|---|---|
| Une feature complète (spéc + GWT + archi + dev) | `workflow-kit/core/templates/feature.md` | `@specs`, `@architect` |

## Marqueurs remplaçables

| Marqueur | À remplacer par | Exemple |
|---|---|---|
| `<Nom>` | Nom (PascalCase) | `Exemple` |
| `<nom>` | Nom (camelCase) | `exemple` |
| `<Noms>` | Pluriel (PascalCase) | `Exemples` |
| `<noms>` | Pluriel (camelCase) | `exemples` |
| `<Nom>FormValues` | Type de valeurs de formulaire | `ExempleFormValues` |
| `<table>` | Nom de table SQL | `exemples` |
| `<colonne>` | Nom de colonne SQL | `exemple_col` |
| `<Channel>` / `<channel>` | Canal IPC | `get-all-exemples` |
| `<NNN>` | Numéro de migration | `004` |
