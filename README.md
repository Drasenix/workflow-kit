# Workflow Kit

Squelette portable du workflow de développement multi-agents (Build + 6 subagents), **agnostique de la techno, du projet et de l'outil IA** : il s'exporte vers **opencode**, vers **Claude Code**, ou vers les deux.

> Objectif : réutiliser la logique de workflow (étapes 0-7, jalons, pauses, TDD, spec parallèle, recette, cadrage PO) sur n'importe quel projet, n'importe quelle stack, avec l'outil IA de son choix.

> **Guide accessible** (archi, installation, skills, exemples) : `docs/guide.md`.

## Modèle : kit imbriqué + adaptateurs

```
<projet>/
├─ workflow-kit/          # DÉPÔT GIT IMBRIQUÉ (a son propre remote), GITIGNORÉ par le projet
│  └─ core/               #   le cœur du workflow, lu EN DIRECT par les agents (aucune copie)
├─ .opencode/             # GÉNÉRÉ si runtime opencode (agents, command, skills), gitignoré
├─ .claude/               # GÉNÉRÉ si runtime claude (agents, skills) ; agents/* et skills/* gitignorés, le reste à toi
├─ .agents/               # PROJET (committé) : glossaire, conventions, architecture, stack,
│                         #   commands, test-rules, ui/component-rules, workflow-commands,
│                         #   templates, specs, reference-utilitaires, feature/, doublons/
├─ AGENTS.md              # committé
├─ CLAUDE.md              # committé : un bloc géré par le kit (runtime claude)
└─ opencode.json          # committé (runtime opencode : permissions subagents + instructions)
```

- **Une seule source** : `core/` est écrit une fois, dans un format neutre. Un **adaptateur** par outil le traduit (`adapters/opencode`, `adapters/claude`).
- **Le cœur n'est pas copié ni lié** : les textes le citent directement à `workflow-kit/core/…` (index, règles du Build, workflow, templates). Seuls les agents, skills et commandes, que chaque outil cherche dans son propre dossier, sont générés dans `.opencode/` et `.claude/`.
- **Le projet ne commite que ce qui lui est propre** : `.agents/`, `AGENTS.md`, `CLAUDE.md`, `opencode.json`, `.gitignore`. Rien d'agnostique. `git -C workflow-kit` pour commit/push du kit.
- **Neutralité des packs** : un pack `packs/<stack>/` décrit **la techno**, jamais le métier. Aucun nom propre de projet, aucune entité métier, aucun package optionnel présenté comme acquis. Le `core/` est en plus agnostique de la techno et de l'outil IA.
- **Commandes techno** : dans `.agents/workflow-commands.md`, chargé **à chaque session** (opencode : `instructions` de `opencode.json` ; Claude Code : import dans `CLAUDE.md`), aucune lecture.

## Arborescence du kit

```
workflow-kit/
├─ README.md  workflow.config.json  package.json
├─ bin/workflow-kit.mjs          CLI : init | sync | verify  (Node >= 18, aucune dépendance)
├─ lib/                          sync, init, verify, migrate, gitignore, frontmatter…
├─ adapters/
│  ├─ opencode/  index.mjs  opencode.agent.json
│  └─ claude/    index.mjs
├─ core/**                       le cœur, cité à workflow-kit/core/ (AGNOSTIQUE, live)
│  ├─ index.md  agent-workflow.md  agent-build.md
│  ├─ agents/{specs,test,architect,dev,review,doc}.md     (format neutre)
│  ├─ skills/{consult-workflow,analyse-flashback,cadrage-po,doc}/
│  ├─ commands/{consult-workflow,cadrage-po,analyse-flashback,doc}.md
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

Point d'entrée : **`bin/workflow-kit.mjs init`** (interactif si les options manquent).

```bash
node workflow-kit/bin/workflow-kit.mjs init --target C:\www\mon-projet --stack laravel-livewire --name mon-projet --runtime both --kit-repo http://gogs.../workflow-kit.git
```

`--runtime` : `opencode`, `claude` ou `both`. L'installation :

1. **Place le kit** dans `<projet>/workflow-kit/` (clone, sinon copie locale sans `.git`) ; la stack et les runtimes sont notés dans `workflow.config.json`.
2. **Matérialise** `.agents/` (seeds projet) + `AGENTS.md`.
3. **Génère les adaptateurs** demandés : `.opencode/` + fusion de `opencode.json` (permissions subagents + `instructions: [".agents/workflow-commands.md"]`), et/ou `.claude/` + bloc géré de `CLAUDE.md`.
4. **Complète le `.gitignore`** (`workflow-kit/`, `.opencode`, et pour Claude `.claude/agents/*` + `.claude/skills/*`).
5. **Migre** les anciens chemins `.opencode/…` et `.workflow/…` des fichiers du projet (voir `docs/mise-a-jour.md`).
6. Crée `.agents/feature/` et rappelle la checklist.

### Après l'installation (manuel)

- Remplir `.agents/domain-glossary.md`, `conventions.md`, `architecture.md`, `stack.md`, `commands.md`.
- Déposer les specs dans `.agents/specs/spec.txt`.
- Si stack `_blank` : compléter `.agents/` puis renommer le pack.

## Écrasement & sécurité

| Zone | Emplacement | Si la cible existe |
|---|---|---|
| **Agnostique** | `workflow-kit/core/` (lu en direct) ; `.opencode/` et `.claude/` (générés) | rien à écraser / régénéré à chaque `sync` |
| **Projet** | `.agents/**`, `AGENTS.md` | **jamais écrasé** : version du kit déposée dans `.agents/doublons/` |

- `--force` (ou `--on-conflict overwrite`) écrase aussi les fichiers **projet**.
- `opencode.json` : seuls `agent.build.permission.task` et `instructions` sont fusionnés (`plugin`/`mcp` intacts).
- **`CLAUDE.md`** : seul le bloc entre `<!-- workflow-kit:start … -->` et `<!-- workflow-kit:end -->` est géré par le kit, le reste n'est jamais touché. Si `CLAUDE.md` est un lien (ex. vers `AGENTS.md`), le kit n'y écrit pas.
- `.claude/` : seul le contenu de `agents/` et `skills/` est gitignoré (`.claude/agents/*`, `.claude/skills/*`) ; `.claude/settings.json` et le reste ne le sont pas. Pour versionner un agent ou une skill à toi, ajoute une exception, par ex. `!.claude/skills/ma-skill/` (elle marche avec `/*`, pas avec `/`).
- `.agents/doublons/` reste visible dans `git status` (à traiter puis supprimer).

## Mise à jour du kit

`workflow-kit/` est un repo git imbriqué, ignoré par le projet : les mises à jour se font avec `git -C workflow-kit fetch` puis `git -C workflow-kit pull`, puis **`workflow-kit sync`**.

- Le contenu **`core/`** (index, règles du Build, workflow, templates) est lu en direct : un `pull` suffit.
- Les adaptateurs (`.opencode/`, `.claude/`) et les **seeds** (`packs/**`, `project/**` vers `.agents/` et `AGENTS.md`) sont **matérialisés** : relancer `sync` après un pull qui les touche.
- **Anti-dérive** : tout **renommage / déplacement** de fichiers fournis par le kit (core ou seeds) **doit** fournir une **migration** (code dans `lib/migrate.mjs` / `lib/sync.mjs`) **ou** une **note explicite**. `sync` réécrit déjà les anciens chemins `.opencode/…` et `.workflow/…` cités dans `.agents/**.md` et `AGENTS.md` ; toute autre référence laissée vers un ancien chemin devient **morte**.

Procédure détaillée, nuances (quarantaine, `workflow.config.json`, nouvelle session) et pièges : **`docs/mise-a-jour.md`**.

## Créer un nouveau pack techno

1. Copier `packs/_blank/` vers `packs/<ma-stack>/`.
2. Remplir `agents/` (conventions, architecture, stack, commands, test-rules, workflow-commands, templates…).
3. `workflow-kit init --stack <ma-stack>`.

Voir `packs/_schema.md`.

## Capacités incluses (core/)

- **Workflow feature** : `agent-workflow.md` (étapes 0→7), `agent-build.md`, `agents/*.md` (6 subagents).
- **Skills génériques** : `consult-workflow`, `analyse-flashback`, `cadrage-po`, `doc` (+ 3 templates).
- **Commandes** : `consult-workflow`, `cadrage-po`, `analyse-flashback`, `doc`. Sous opencode, ce sont des commandes ; sous Claude Code, ce sont les skills du même nom (`/doc`, …), donc aucune commande n'est dupliquée dans `.claude/commands/`.

## Auditer

`node bin/workflow-kit.mjs verify` : audit **auto-portant** (aucune référence à un projet de référence), code de sortie 1 en cas d'écart :

1. **Core agnostique** : aucun terme projet ni techno dans `core/`, aucun chemin `.opencode` ni `.workflow` (le core se cite à `workflow-kit/core/`).
2. **Neutralité des packs** : aucun terme projet/métier dans `packs/<stack>/agents/**`.
3. **Références mortes** : anciens noms (`agent-frontend.md`, `agent-livewire.md`, `agent-opencode.md`…) interdits dans `packs/`.
4. **Fichiers requis** présents (core + packs).
5. **Round-trip** : matérialisation générique pour `opencode`, `claude` et `opencode+claude` (jetons résolus, agents valides, bloc `CLAUDE.md`, `.gitignore`, aucun artefact d'un runtime non demandé).
6. **Migration** : un projet installé avec un ancien modèle (`.opencode` lié au core, ou lien `.workflow`) est converti sans toucher aux anciens cores.
