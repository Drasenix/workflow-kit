# Mettre à jour le kit dans un projet

> Public : développeur qui a installé le workflow-kit dans un projet.
> But : savoir ce qui se met à jour tout seul, et ce qui exige de relancer `sync`.

## Le modèle en bref

```
<projet>/
├─ workflow-kit/          # repo git imbriqué (ignoré par le projet) ; son core/ est lu en direct
├─ .opencode/             # GÉNÉRÉ depuis core/ (runtime opencode)
└─ .claude/               # GÉNÉRÉ depuis core/ (runtime claude)
```

Les textes du workflow citent le cœur à `workflow-kit/core/…` : index, règles du Build, workflow, templates sont donc **lus en direct**. Tu modifies `workflow-kit/core` (ou un `pull` le fait), le projet suit, sans copie ni lien.

Ce que l'outil IA charge lui-même (agents, skills, commandes) est **généré** dans `.opencode/` et `.claude/` : il faut relancer `sync` pour le régénérer. Les seeds (`packs/<stack>/agents/**`, `project/agents/**`, `project/AGENTS.md`) et la fusion `opencode.json` / le bloc `CLAUDE.md` sont aussi **matérialisés** par `sync`.

## Règle d'or

| Modifié dans le kit | Effet sur le projet | Action |
|---|---|---|
| `core/**` hors agents, skills, commandes (index, règles du Build, workflow, templates) | lu en direct | aucune, mais nouvelle session de l'outil |
| `core/agents/**`, `core/skills/**`, `core/commands/**` | `.opencode/` et `.claude/` sont des copies générées | `sync`, puis nouvelle session |
| `packs/<stack>/**` | seeds copiés vers `.agents/**` | `sync` |
| `project/**` (`AGENTS.md`, glossaire, specs, `reference-utilitaires`) | seeds projet | `sync` |
| `adapters/**` | `opencode.json`, `.opencode/`, `.claude/`, `CLAUDE.md` | `sync` |
| `bin/**`, `lib/**` | outillage du kit | aucune |

## Procédure

1. Récupérer les changements du kit. Toujours avec `-C` : le parent gitignore `workflow-kit/` et ne le gère pas.

   ```bash
   git -C workflow-kit fetch
   git -C workflow-kit pull
   ```

2. Régénérer (le plus simple : toujours le faire après un pull).

   ```bash
   node workflow-kit/bin/workflow-kit.mjs sync
   ```

   `sync` relit `workflow.config.json` (stack et runtimes). Options utiles : `--runtime opencode|claude|both`, `--stack <pack>`, `--force`.

3. Repartir sur une **nouvelle session** de l'outil : config, agents, skills et commandes sont lus au démarrage.

(`init` sert à une installation complète sur un nouveau projet.)

## Migration depuis un ancien modèle

Deux anciens modèles existent :

- **modèle d'origine** : `.opencode` était un lien vers `workflow-kit/core` ;
- **version intermédiaire** : le cœur était lié dans `.workflow`, et `.opencode/` était généré.

Dans les deux cas, lancer `sync` sur le projet suffit :

- un ancien lien `.opencode` est **supprimé sans suivre sa cible** (rien n'est écrit dans `workflow-kit/core`), puis `.opencode/` est régénéré en vrai dossier ;
- un lien `.workflow` est supprimé de la même façon ;
- les chemins cités dans `.agents/**.md` et `AGENTS.md` sont réécrits (la liste des fichiers touchés s'affiche) :

  | Ancien chemin | Nouveau chemin |
  |---|---|
  | `.opencode/agent-opencode.md` | `workflow-kit/core/agent-build.md` |
  | `.opencode/agent-workflow.md`, `.opencode/index.md`, `.opencode/templates/feature.md` | `workflow-kit/core/…` (même nom) |
  | `.opencode/agents/`, `.opencode/skills/` (core) | `workflow-kit/core/agents/`, `workflow-kit/core/skills/` |
  | `.opencode/command/` | `workflow-kit/core/commands/` |
  | `.opencode/skills/{tests,recette,migrate-fresh}`, `.opencode/templates/{backend,frontend,tests}` | `.agents/skills/…`, `.agents/templates/…` |
  | `.opencode/feature/`, `.opencode/doc/` | `.agents/feature/`, `.agents/doc/` |
  | `.workflow/…` | `workflow-kit/core/…` |

- **Phrase de déclenchement** : « consulte .opencode » devient « consulte le workflow ». La skill `consult-workflow` répond à cette formulation.
- Les références vers un chemin que le kit ne connaît pas ne sont **pas** réécrites : les chercher avec `grep -rn "\.opencode/\|\.workflow/" .agents AGENTS.md`.
- Si `.workflow` figure dans le `.gitignore` du projet (version intermédiaire), la ligne peut être supprimée.

## Passage au workflow à deux phases (raffinement / réalisation)

Cette version sépare la feature en deux sessions : **raffinement** (étapes 0-1, agent principal `raffineur`, sous-agents `@doc`, `@explorateur`, `@challenger`) et **réalisation** (étapes 2-7, Build). Les agents `specs` et `architect` sont **retirés** : `@dev` rédige le plan (étape 3) avant le code. Mode d'emploi : `docs/guide.md` § 4.1.

### Ce que `sync` fait seul

- génère les nouveaux agents (`.opencode/agents/`, `.claude/agents/`) et **supprime** les fichiers générés de `specs` et `architect` ;
- dans `opencode.json` : ajoute `agent.raffineur.permission.task` (doc, explorateur, challenger) et retire `specs` / `architect` des autorisations ;
- complète le `.gitignore` (un projet qui a ses propres agents dans `.claude/agents/` reçoit les nouveaux fichiers un par un).

### Ce qui reste à faire à la main

1. **Commiter** dans le projet `opencode.json` et `.gitignore`, modifiés par `sync`.
2. **Seeds déjà matérialisés** : `sync` ne les écrase pas (version du kit en quarantaine dans `.agents/doublons/`). Chercher les mentions des agents retirés et les remplacer (`@specs` → raffineur, `@architect` → `@dev`) :

   ```bash
   grep -rn "@specs\|@architect\|agents/specs\.md\|agents/architect\.md" .agents AGENTS.md --include=*.md
   ```

   Ignorer les fichiers de feature clos (`DONE-*`, `ABANDON-*`, `IRREPRODUCTIBLE-*`) : ce sont des archives. Typiquement : `.agents/templates-index.md`, l'en-tête de `.agents/specs/spec-parallele.md`. Puis supprimer `.agents/doublons/`.
3. **Features en cours** (fichier sans préfixe de clôture, ouvert avec l'ancien gabarit) — selon la première étape non faite de sa Progression :

   | Feature arrêtée à… | Que faire |
   |---|---|
   | étape 0 ou 1 | la reprendre dans une **session raffineur**. Les sections `## Contexte technique` et `## Arbitrages du challenge` peuvent être ajoutées depuis le gabarit : le contrôle ne les exige que si le fichier les porte |
   | étape 2 ou 3 (architecture pas encore faite) | renommer `## Architecture (étape 3)` en `## Plan (étape 3)` et remplacer ses sous-sections par celles du gabarit : `@dev` y écrira le plan |
   | étape 4 ou au-delà (architecture faite par l'ancien `@architect`) | renommer `## Architecture (étape 3)` en `## Plan (étape 3)` : l'arbre, les fichiers et le code réutilisé valent plan, le `### Contrat d'implémentation` vaut signatures publiques. Ajouter `### Écarts au plan` (rempli par `@dev` à l'étape 4) et, dans la revue, `### Décisions techniques` |

   Une feature terminée sous l'ancien modèle (`DONE-*`) ne se modifie pas : la compaction reconnaît les deux formats.
4. **Nouvelle session** de l'outil (agents et skills sont lus au démarrage).

## Nuance sur les seeds

Sans `--force`, `sync` **n'écrase jamais** un fichier projet déjà présent : la version du kit part en quarantaine dans `.agents/doublons/`. Conséquence : un seed déjà matérialisé puis modifié côté kit ne se propage pas tout seul. Reporter le changement à la main, ou relancer avec `--force` (écrase), ou traiter `.agents/doublons/`.

## `workflow.config.json`

Ce fichier est **suivi par le kit** mais contient des choix propres au projet : la stack (ex. `laravel-livewire`) et les runtimes (`["opencode", "claude"]`). Un `pull` peut donc le modifier ou le mettre en conflit. En cas de conflit, garder la valeur du projet. Sans clé `runtimes`, seul `opencode` est généré.

## Runtimes : nouvelle session

Le système de fichiers est à jour dès le `sync`. Mais opencode comme Claude Code chargent config, agents, skills et commandes à leur démarrage : un changement n'est pas forcément pris en compte dans une session déjà ouverte. Repartir sur une nouvelle session.

## Pièges à éviter

- **Ne pas commiter `.opencode/` ni les fichiers générés de `.claude/`** : `sync` les régénère. Si une branche ancienne suit encore `.opencode/`, le dé-suivre avec `git rm -r --cached .opencode`.
- **Ne pas éditer à la main `.opencode/` ni les fichiers générés de `.claude/`** : `sync` les écrase. Modifier la source dans `workflow-kit/core/`.
- **Le kit doit rester à `<projet>/workflow-kit/`** : les textes citent `workflow-kit/core/…` depuis la racine du projet. `sync` avertit si le kit est ailleurs.

## Vérifications rapides

```powershell
# Le kit est intact (seul workflow.config.json peut apparaître modifié)
git -C workflow-kit status --short

# Le cœur est lisible
Test-Path workflow-kit/core/index.md

# Audit complet du kit
node workflow-kit/bin/workflow-kit.mjs verify
```

## Voir aussi

- `README.md` : modèle « kit imbriqué + adaptateurs », écrasement et quarantaine.
- `bin/workflow-kit.mjs` (`init`, `sync`, `verify`, `check`, `check-meta`, `compact`) et `lib/` : installation, matérialisation, migration, audit, contrôle et compaction des fichiers de feature.
- `adapters/` : ce qui est généré pour chaque outil IA.
