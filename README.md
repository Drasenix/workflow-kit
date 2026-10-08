# Workflow Kit

Squelette portable du workflow de développement multi-agents (Build + 6 subagents), **agnostique de la techno et du projet**.

> Objectif : réutiliser la logique de workflow (étapes 0-7, jalons, pauses, TDD, spec parallèle, recette, cadrage PO) sur n'importe quel projet et n'importe quelle stack.

> **Guide accessible** (archi, installation, skills, exemples) : `docs/guide.md`.

## Modèle : kit imbriqué + lien

```
<projet>/
├─ workflow-kit/          # DÉPÔT GIT IMBRIQUÉ (a son propre remote), GITIGNORÉ par le projet
├─ .opencode  ───────────────► workflow-kit/core     # LIEN (junction Windows / symlink Linux) : AGNOSTIQUE, LIVE
├─ .agents/               # PROJET (committé) : glossaire, conventions, architecture, stack,
│                         #   commands, test-rules, ui/component-rules, workflow-commands,
│                         #   templates, specs, reference-utilitaires, feature/, doublons/
├─ AGENTS.md              # committé
└─ opencode.json          # committé (permissions subagents + instructions)
```

- **L'agnostique n'est pas copié** : `.opencode` pointe vers `workflow-kit/core`. Tu édites le kit, le projet suit (pas de re-matérialisation). `git -C workflow-kit` pour commit/push.
- **Le projet ne commite que ce qui lui est propre** : `.agents/`, `AGENTS.md`, `opencode.json`, `.gitignore`. Rien d'agnostique.
- **Neutralité des packs** : un pack `packs/<stack>/` décrit **la techno**, jamais le métier. Aucun nom propre de projet, aucune entité métier, aucun package optionnel présenté comme acquis. Le `core/` est en plus agnostique de la techno.
- **Commandes techno** : dans `.agents/workflow-commands.md`, déclaré dans `opencode.json` (`instructions`) → **toujours en contexte**, aucune lecture.

## Arborescence du kit

```
workflow-kit/
├─ README.md  workflow.config.json  opencode.agent.json
├─ scripts/  init.ps1  bootstrap.ps1  bootstrap.sh
├─ tools/    verify-kit.ps1
├─ core/**                       -> .opencode/   (AGNOSTIQUE, live)
│  ├─ index.md  agent-workflow.md  agent-opencode.md
│  ├─ agents/{specs,test,architect,dev,review,doc}.md
│  ├─ skills/{consult-workflow,analyse-flashback,cadrage-po,doc}/
│  ├─ command/{consult-workflow,cadrage-po,analyse-flashback,doc}.md
│  └─ templates/feature.md
├─ packs/<stack>/agents/**       -> .agents/     (SEEDS TECHNO)
│  └─ laravel-livewire/  _blank/
└─ project/
   ├─ AGENTS.md                  -> AGENTS.md    (GÉNÉRIQUE)
   ├─ agents/**                  -> .agents/
   │  ├─ domain-glossary.md  reference-utilitaires.md
   │  └─ specs/{README.md,spec-parallele.md,spec.txt}
   └─ _models/living-doc.md      (modèle, non copié)
```

## Démarrer sur un nouveau projet

Point d'entrée : **`scripts/init.ps1`** (interactif si les paramètres manquent).

```powershell
./scripts/init.ps1 -Target C:\www\mon-projet -Stack laravel-livewire -Name mon-projet -KitRepo http://gogs.../workflow-kit.git
```

1. **Clone** le kit dans `<projet>/workflow-kit/` (sinon copie locale sans `.git`), et **gitignore** `workflow-kit/` + `.opencode/`.
2. **Crée le lien** `.opencode` → `workflow-kit/core` (junction Windows / symlink Linux).
3. **Matérialise** `.agents/` (seeds projet) + `AGENTS.md`.
4. **Fusionne** `opencode.json` (permissions subagents + `instructions: [".agents/workflow-commands.md"]`).
5. Crée `.agents/feature/` et rappelle la checklist.

### Après l'installation (manuel)

- Remplir `.agents/domain-glossary.md`, `conventions.md`, `architecture.md`, `stack.md`, `commands.md`.
- Déposer les specs dans `.agents/specs/spec.txt`.
- Si stack `_blank` : compléter `.agents/` puis renommer le pack.

## Écrasement & sécurité

| Zone | Emplacement | Si la cible existe |
|---|---|---|
| **Agnostique** | `.opencode` (lien vers `workflow-kit/core`) | live, jamais copié |
| **Projet** | `.agents/**`, `AGENTS.md` | **jamais écrasé** : version du kit déposée dans `.agents/doublons/` |

- `-Force` (ou `-OnConflict Overwrite`) écrase aussi les fichiers **projet**.
- `opencode.json` : seuls `agent.build.permission.task` et `instructions` sont fusionnés (`plugin`/`mcp` intacts).
- **`CLAUDE.md` n'est jamais une cible** : ni créé, ni supprimé, ni dupliqué.
- `.agents/doublons/` reste visible dans `git status` (à traiter puis supprimer).

## Mise à jour du kit

`workflow-kit/` est un repo git imbriqué, ignoré par le projet : les mises à jour se font avec `git -C workflow-kit fetch` puis `git -C workflow-kit pull`.

- Le contenu **`core/`** est monté en **lien** dans `.opencode` : il est **live**, aucun script à relancer.
- Les **seeds** (`packs/**`, `project/**`, `opencode.agent.json` vers `.agents/`, `AGENTS.md`, `opencode.json`) sont **matérialisés** : relancer `scripts/bootstrap.ps1` après un pull qui les touche.
- **Anti-dérive** : tout **renommage / déplacement** de fichiers fournis par le kit (core ou seeds) **doit** fournir une **migration** (script) **ou** une **note explicite**. Les fichiers-rôles des projets (`.agents/**`) ne sont **pas** réécrits automatiquement : une référence laissée vers un ancien chemin devient **morte** (cas `abeac8e`).

Procédure détaillée, nuances (quarantaine, `workflow.config.json`, nouvelle session opencode) et pièges (checkout d'une branche qui suit `.opencode`) : **`docs/mise-a-jour.md`**.

## Créer un nouveau pack techno

1. Copier `packs/_blank/` vers `packs/<ma-stack>/`.
2. Remplir `agents/` (conventions, architecture, stack, commands, test-rules, workflow-commands, templates…).
3. `init.ps1 -Stack <ma-stack>`.

Voir `packs/_schema.md`.

## Capacités incluses (core/)

- **Workflow feature** : `agent-workflow.md` (étapes 0→7), `agent-opencode.md`, `agents/*.md` (6 subagents).
- **Skills génériques** : `consult-workflow`, `analyse-flashback`, `cadrage-po`, `doc` (+ 3 templates).
- **Slash commands** : `consult-workflow`, `cadrage-po`, `analyse-flashback`, `doc`.

## Auditer

`tools/verify-kit.ps1` : audit **auto-portant** (aucune référence à un projet de référence) :

1. **Core agnostique** : aucun terme projet ni techno dans `core/`.
2. **Neutralité des packs** : aucun terme projet/métier dans `packs/<stack>/agents/**`.
3. **Références mortes** : anciens noms (`agent-frontend.md`, `agent-livewire.md`…) interdits dans `packs/`.
4. **Fichiers requis** présents (core + packs).
5. **Round-trip** : matérialisation générique (`-ProjectName demo`) sans jeton non résolu.

```powershell
./tools/verify-kit.ps1
```
