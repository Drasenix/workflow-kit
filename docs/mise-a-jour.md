# Mettre à jour le kit dans un projet

> Public : développeur qui a installé le workflow-kit dans un projet (mode lien).
> But : savoir ce qui se met à jour tout seul, et ce qui exige de relancer le script.

## Le modèle en bref

```
<projet>/
├─ workflow-kit/          # repo git imbriqué (ignoré par le projet)
└─ .opencode  ──────────► workflow-kit/core   # LIEN (junction Windows / symlink Linux), LIVE
```

`.opencode` est un lien vers `workflow-kit/core`. Le contenu agnostique (index, agents, skills, command, templates) est donc **live** : tu modifies `workflow-kit/core` (ou un `pull` le fait), le projet suit, sans copie ni script.

Le reste du kit n'est **pas** monté en lien. Les seeds (`packs/<stack>/agents/**`, `project/agents/**`, `project/AGENTS.md`) et la fusion `opencode.json` sont **matérialisés** dans le projet par le script. Un `pull` qui les touche exige de relancer le script.

## Règle d'or

| Modifié dans le kit | Effet sur le projet | Action |
|---|---|---|
| `core/**` (index, agents, skills, command, templates) | visible immédiatement via `.opencode` | aucune, mais nouvelle session opencode |
| `packs/<stack>/**` | seeds copiés vers `.agents/**` | relancer le script |
| `project/**` (`AGENTS.md`, glossaire, specs, `reference-utilitaires`) | seeds projet | relancer le script |
| `opencode.agent.json` | fusionné dans `opencode.json` | relancer le script |
| `scripts/**`, `tools/**` | outillage du kit | aucune |

## Procédure

1. Récupérer les changements du kit. Toujours avec `-C` : le parent gitignore `workflow-kit/` et ne le gère pas.

   ```powershell
   git -C workflow-kit fetch
   git -C workflow-kit pull
   ```

2. Si seule la partie `core/` a bougé : rien à faire côté fichiers. Repartir sur une **nouvelle session** opencode (config, agents, skills et commandes sont lus au démarrage).

3. Si `packs/`, `project/` ou `opencode.agent.json` ont bougé : matérialiser.

   ```powershell
   ./workflow-kit/scripts/bootstrap.ps1 -Target . -Stack laravel-livewire -Mode Link
   ```

   (`init.ps1` pour une installation complète sur un nouveau projet.)

## Nuance sur les seeds

Sans `-Force`, le script **n'écrase jamais** un fichier projet déjà présent : la version du kit part en quarantaine dans `.agents/doublons/`. Conséquence : un seed déjà matérialisé puis modifié côté kit ne se propage pas tout seul. Reporter le changement à la main, ou relancer avec `-Force` (écrase), ou traiter `.agents/doublons/`.

## `workflow.config.json`

Ce fichier est **suivi par le kit** mais contient un choix propre au projet (la stack, ex. `laravel-livewire`). Un `pull` peut donc le modifier ou le mettre en conflit. En cas de conflit, garder la valeur du projet.

## Runtime opencode

Le système de fichiers est à jour dès le `pull`. Mais opencode charge config, agents, skills et commandes à son démarrage : un changement sous `core/` n'est pas forcément pris en compte dans une session déjà ouverte. Repartir sur une nouvelle session.

## Pièges à éviter

- **Ne jamais faire un `git checkout` d'une branche du projet (parent) qui suit `.opencode/`.** `.gitignore` ne protège pas un fichier déjà suivi. Git créerait ou supprimerait les entrées `.opencode/...` et, comme `.opencode` est un lien, l'opération frapperait `workflow-kit/core` (fichiers supprimés, lien détruit). Si des branches anciennes suivent encore `.opencode/`, les dé-suivre (`git rm -r --cached .opencode`) avant tout checkout.
- **Ne pas laisser le lien `.opencode` en place pendant un rebase ou un checkout qui touche `.opencode`.** Les écritures passent à travers le lien et polluent `workflow-kit/core`. Retirer le lien avant, le recréer après.

## Vérifications rapides

```powershell
# Le lien existe et pointe vers core
Get-Item .opencode -Force | Select-Object LinkType, Target

# Le contenu du kit est intact (seul workflow.config.json peut apparaître modifié)
git -C workflow-kit status --short

# Le lien est lisible
Test-Path .opencode/index.md
```

## Voir aussi

- `README.md` : modèle « kit imbriqué + lien », écrasement et quarantaine.
- `scripts/init.ps1` : installation sur un nouveau projet.
- `scripts/bootstrap.ps1` : matérialisation des seeds et création du lien.
- `tools/verify-kit.ps1` : audit auto-portant (core agnostique, neutralité des packs, round-trip).
