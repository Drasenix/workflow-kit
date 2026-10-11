# Architecture (Electron + React + TypeScript)

> **Statut : DÉFAUT PACK** — arborescence techno du socle `electron-react-boilerplate` ; le projet la spécialise.
> Aucun domaine métier ici : les domaines réels vivent côté projet.

## Processus

| Processus | Dossier | Rôle |
|---|---|---|
| **Main** | `src/main/` | Backend Electron : fenêtre, menu, base de données, fichiers, handlers IPC. |
| **Preload** | `src/main/preload.ts` | `contextBridge` : définition typée des canaux IPC exposés au renderer. |
| **Renderer** | `src/renderer/` | UI React (browser context). |
| **Shared** | `src/shared/` | Types/DTO partagés main ↔ renderer. |

## Arborescence

```
src/
├── main/            # processus main (entry, preload, icpEvents, menu…)
├── renderer/        # processus renderer
│   ├── App.tsx      # racine : Router + providers
│   ├── components/  # UI partagée
│   ├── hooks/       # hooks partagés
│   ├── utils/       # utilitaires partagés
│   └── features/    # domaines feature-sliced
└── shared/          # models/ + types/
```

## Communication main ↔ renderer

1. Les canaux IPC sont **typés** dans `preload.ts` (union de chaînes).
2. Tous les handlers sont enregistrés dans `src/main/icpEvents.ts`.
3. Le renderer appelle via `window.electron.ipcRenderer.invokeMessage(channel, ...args)`.
4. Toujours typer le channel ; jamais de chaîne brute.
5. Dans les `catch` renderer, utiliser `extractIpcError()` pour nettoyer le message avant affichage.

## Providers (ordre d'imbrication)

```
Router
  └── AudioProvider
      └── <DonnéesProvider>
          └── <UIProvider>
              └── Routes
```

L'ordre reflète les dépendances : un provider ne consomme que ceux qui l'englobent.

## Feature-sliced (par domaine)

```
features/<domaine>/
├── models/ types/ adapters/ services/ facade/ engine/ hooks/ contexts/ components/ utils/
```

- `engine/` = logique métier pure ; `facade/` = API publique.
- Pas d'interface entre facade et service : l'appel IPC est direct.
