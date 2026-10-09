# Contrat des packs (seeds projet)

Un pack fournit les **fichiers propres à une stack** qui vont dans le dossier projet `.agents/`.
L'arborescence du pack **est** la destination : `packs/<stack>/agents/**` → `.agents/**`.

## Modèle

```
workflow-kit/
├─ core/**                    -> lu en direct à workflow-kit/core/   (agnostique ; agents/skills générés dans .opencode/ et .claude/)
├─ packs/<stack>/agents/**    -> .agents/**     (projet : quarantaine si existe)
├─ project/agents/**          -> .agents/**     (projet, générique)
└─ project/AGENTS.md          -> AGENTS.md      (projet)
```

- `pack.md` est la **doc** du pack (jamais copiée).
- Aucun manifeste, aucun slot : le nom du fichier est son nom de destination **et** l'interface stable du core (un rôle générique). Chaque projet remplit ces fichiers selon sa propre approche — le **contenu** peut diverger d'un projet à l'autre, pas les noms.

## Fichiers typiques d'un pack (`agents/`)

| Fichier | Rôle |
|---|---|
| `conventions.md` | Conventions de code (langue, organisation, style) |
| `architecture.md` | Arborescence, routing, couches, flux |
| `stack.md` | Runtime, frameworks, dépendances |
| `commands.md` | Commandes dev / tests / format / fallback |
| `test-rules.md` | Règles d'écriture des tests (dossiers, helpers, config) |
| `ui-rules.md` | Conventions UI |
| `component-rules.md` | Conventions composants / exports |
| `templates-index.md` + `templates/**` | Templates de code |
| `skills/<nom>/SKILL.md` | Skills techno (ex. `tests`, `recette`) |

> Les fichiers **génériques** (glossaire, specs, reference-utilitaires, procédures) vivent dans `project/agents/`, pas dans le pack.

## Créer un pack

1. Copier `packs/_blank/` vers `packs/<ma-stack>/`.
2. Remplir `agents/` avec le contenu de la stack (conventions, architecture, stack, commands, test-rules…).
3. Lancer `workflow-kit init --stack <ma-stack>`.

## Règles

- Le pack ne contient **aucun** contenu agnostique (ça, c'est `core/`).
- Le pack ne référence jamais `core/` : il vit côté projet (`.agents/`).
- Les noms de fichiers sont **fixes** (conventions.md, architecture.md…) : `core/` les référence en dur.
