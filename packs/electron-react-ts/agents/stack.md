# Stack (Electron + React + TypeScript)

> **Statut : DÉFAUT PACK** — versions de référence du socle ; aligner sur le `package.json` réel du projet.

## Runtime

- **Electron** : 35.x (main + renderer)
- **Node.js** : géré par le socle (webpack / ts-node)
- **Langage** : TypeScript 5.8 (`strict`)

## Frameworks et bibliothèques

| Package | Version | Rôle |
|---|---|---|
| `react` | 19.x | UI renderer |
| `react-dom` | 19.x | Rendu DOM |
| `react-router-dom` | 7.x | Routing |
| `tone` | 15.x | Moteur audio (Web Audio) |
| `better-sqlite3` | — | Base de données locale (main) |
| `archiver` / `adm-zip` | — | Archives (export / import) |
| `lucide-react` | — | Icônes |
| `driver.js` | — | Visites guidées |

## Outillage

| Outil | Rôle |
|---|---|
| `webpack` (+ `.erb/`) | Bundle main / renderer / preload |
| `electron-builder` | Packaging |
| `tailwindcss` 3 | Styles |
| `jest` + `ts-jest` + `jest-environment-jsdom` | Tests |
| `eslint` (`eslint-config-erb`) + `prettier` | Lint / format |

## Configs TypeScript

| Fichier | Usage |
|---|---|
| `tsconfig.json` | Base (strict) |
| `tsconfig.main.json` | Main process (`module: node16`) |
| `tsconfig.renderer.json` | Renderer (`module: esnext`, `dom`) |
