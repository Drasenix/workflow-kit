# Guide du workflow-kit

> Public : toute personne qui découvre le kit (dev, PO, QA).
> But : comprendre ce qu'il y a dans `workflow-kit/`, comment on l'installe, et comment on travaille au quotidien.
> Aucune connaissance préalable de la stack n'est nécessaire pour lire ce document.

---

## 1. À quoi sert le kit ?

Le workflow-kit apporte, à **n'importe quel projet** et **n'importe quelle stack**, une même façon de travailler :

- un **workflow de feature en 8 étapes** (0→7), avec TDD strict et pauses de validation ;
- **6 subagents spécialisés** (specs, tests, architecture, dev, revue, doc) orchestrés par l'agent principal ;
- des **skills** transverses : consulter le workflow, cadrer un sujet métier (PO), diagnostiquer un ticket antidaté, répondre à une question métier ;
- une **mémoire projet** : glossaire, conventions, spec officielle + **spec parallèle** (`SP-*`).

La promesse : la logique de travail est écrite **une fois**, dans le kit, et se réutilise partout.

---

## 2. Architecture & notion d'agnostisme

### 2.1 Les couches

Le kit sépare des choses qui ne doivent jamais se mélanger :

```
workflow-kit/                    (dépôt git IMBRIQUÉ, ignoré par le projet)
├─ core/          → lu EN DIRECT   à <projet>/workflow-kit/core/   (AGNOSTIQUE : techno + projet + outil IA)
├─ adapters/      → génèrent       <projet>/.opencode/ et/ou <projet>/.claude/  (un adaptateur par outil IA)
├─ packs/<stack>/ → copié dans     <projet>/.agents/     (TECHNO : Laravel, React…)
├─ project/       → copié dans     <projet>/.agents/     (GÉNÉRIQUE : glossaire, specs)
├─ bin/ lib/      → outillage Node : `workflow-kit init | sync | verify`
└─ docs/          → documentation du kit (ce fichier, mise-a-jour.md)
```

Et côté projet consommateur :

```
<projet>/
├─ workflow-kit/            # le kit, gitignoré par le projet ; son core/ est lu en direct
├─ .opencode/               # GÉNÉRÉ (runtime opencode), gitignoré : agents, commandes, skills
├─ .claude/                 # runtime Claude Code : agents + skills GÉNÉRÉS (agents/* et skills/* gitignorés)
├─ .agents/                 # COMMITÉ : conventions, glossaire, specs, templates…
├─ AGENTS.md                # COMMITÉ
├─ CLAUDE.md                # COMMITÉ : un bloc géré par le kit (runtime claude)
└─ opencode.json            # COMMITÉ : permissions subagents + instructions (runtime opencode)
```

Le projet choisit son runtime à l'installation : `opencode`, `claude`, ou `both`.

### 2.2 Ce que veut dire « agnostique »

- **`core/` ne connaît ni la techno, ni le métier, ni l'outil IA.** Il parle de **rôles génériques** : « le fichier de conventions », « la stack », « le spec officiel », « l'outil de délégation de sous-agent ». Il référence des **noms de fichiers fixes** (interface stable : `conventions.md`, `architecture.md`, `stack.md`…) mais jamais leur contenu. Chaque projet les remplit à sa façon.
- **Les agents sont écrits une seule fois**, dans un format neutre (`name`, `description`, `tools: {read: allow, shell: deny…}`). Chaque adaptateur les traduit dans le format de son outil.
- **`packs/<stack>/` ne connaît que la techno, jamais le métier.** Le pack `laravel-livewire/` décrit Laravel/Livewire/PHPUnit, mais aucun nom d'entité métier.
- **`project/` est générique à tout projet** : glossaire, spec, spec parallèle, `AGENTS.md`.

> **Règle d'or :** le kit ne contient jamais de contenu propre à un projet, et un pack ne contient jamais de métier. Le `core/` est en plus agnostique de la techno et de l'outil IA.

### 2.3 Le modèle « kit imbriqué + adaptateurs »

- `workflow-kit/` est un **dépôt git imbriqué**, ignoré par le projet. On le met à jour avec `git -C workflow-kit …`.
- Le **cœur** (index, règles du Build, workflow, templates) n'est ni copié ni lié : les textes le citent à `workflow-kit/core/…`, il est donc **LIVE**.
- `.opencode/` et `.claude/` sont **générés** depuis `core/` par `workflow-kit sync` : un changement des agents, skills ou commandes demande de relancer `sync`.
- Le **projet ne commite que ce qui lui est propre** : `.agents/`, `AGENTS.md`, `CLAUDE.md`, `opencode.json`, `.gitignore`. Rien d'agnostique.

Contraste à retenir :

| | `workflow-kit/core/` | `.opencode/`, `.claude/` | `.agents/` |
|---|---|---|---|
| Nature | cœur lu en direct | fichiers générés | copie matérialisée |
| Contenu | agnostique | agnostique, au format de l'outil | propre au projet |
| Commité ? | non (le kit est gitignoré) | non (gitignore) | oui |
| Mise à jour | live (pull du kit) | relancer `sync` | relancer `sync` si le seed change |

---

## 3. Installation : comment et ce que ça fait

### 3.1 Point d'entrée

Une CLI Node (Node ≥ 18, aucune dépendance), `workflow-kit/bin/workflow-kit.mjs` :

- **Nouveau projet** : `init` (interactif si les options manquent).
- **Mise à jour des seeds et régénération des adaptateurs** : `sync`.
- **Audit du kit** : `verify`.

Exemple :

```bash
node workflow-kit/bin/workflow-kit.mjs init --target C:\www\mon-projet --stack laravel-livewire --name mon-projet --runtime both --kit-repo http://gogs.../workflow-kit.git
```

Si le kit n'est pas encore dans le projet, lancer la commande depuis une copie du kit ; `init` le place dans `<projet>/workflow-kit/`.

### 3.2 Ce que fait l'installation, dans l'ordre

1. **Place le kit** dans `<projet>/workflow-kit/` (clone, sinon copie locale sans `.git`) et enregistre la stack et les runtimes dans `workflow.config.json`.
2. **Matérialise les seeds** : `packs/<stack>/agents/**` + `project/agents/**` → `.agents/`, et `project/AGENTS.md` → `AGENTS.md`.
3. **Génère les adaptateurs** demandés :
   - `opencode` : `.opencode/{agents,command,skills}` et fusion de `opencode.json` (permissions `agent.build.permission.task` pour les 6 subagents, `instructions: [".agents/workflow-commands.md"]`). Le reste (`plugin`, `mcp`) est préservé.
   - `claude` : `.claude/{agents,skills}` et un bloc géré dans `CLAUDE.md` (imports `@AGENTS.md` et `@.agents/workflow-commands.md`). Le reste de `CLAUDE.md` n'est jamais touché.
4. **Complète le `.gitignore`** : `workflow-kit/`, `.opencode`, et pour Claude `.claude/agents/*` et `.claude/skills/*` (le reste de `.claude/`, par ex. `settings.json`, n'est pas ignoré ; pour versionner un agent ou une skill à toi, ajoute une exception `!.claude/skills/ma-skill/`).
5. **Réécrit les anciens chemins** `.opencode/…` et `.workflow/…` cités dans `.agents/**.md` et `AGENTS.md` (voir `docs/mise-a-jour.md`, « Migration »).
6. **Crée `.agents/feature/`** et affiche la checklist post-installation.

### 3.3 Sécurité d'écrasement

| Zone | Emplacement | Si la cible existe déjà |
|---|---|---|
| **Agnostique** | `workflow-kit/core/` (lu en direct), `.opencode/` et `.claude/` (générés) | rien à écraser / régénéré à chaque `sync` |
| **Projet** | `.agents/**`, `AGENTS.md` | **jamais écrasé** : la version du kit part en quarantaine dans `.agents/doublons/` |

- `--force` (ou `--on-conflict overwrite`) écrase aussi les fichiers projet.
- `.agents/doublons/` reste visible dans `git status` (à traiter à la main, puis supprimer).
- `CLAUDE.md` : seul le bloc entre les marqueurs `<!-- workflow-kit:start -->` et `<!-- workflow-kit:end -->` est géré par le kit. Si `CLAUDE.md` est un lien (par ex. vers `AGENTS.md`), le kit n'y écrit pas.

### 3.4 Après l'installation (manuel)

- Remplir `.agents/domain-glossary.md`, `conventions.md`, `architecture.md`, `stack.md`, `commands.md`.
- Déposer les specs officielles dans `.agents/specs/spec.txt`.
- Si stack `_blank` : compléter `.agents/` puis créer/adopter un pack.

### 3.5 Mise à jour du kit

```bash
git -C workflow-kit fetch
git -C workflow-kit pull
node workflow-kit/bin/workflow-kit.mjs sync
```

- `core/` a bougé → le cœur est déjà à jour (lu en direct) ; lancer `sync` pour régénérer `.opencode/` et `.claude/`, puis repartir sur une **nouvelle session** de l'outil (config, agents, skills et commandes sont lus au démarrage).
- `packs/` ou `project/` ont bougé → `sync` aussi.

Détails, nuances et pièges : `docs/mise-a-jour.md`.

---

## 4. Le workflow d'une feature (étapes 0→7)

Orchestré par l'agent **Build** (agent principal), qui délègue chaque étape à un **subagent** via l'outil de délégation (`Task` sous opencode, `Agent` sous Claude Code).

| # | Étape | Agent | Livrable | Pause |
|---|---|---|---|---|
| 0 | Consulter les specs | `@specs` | Résumé sourcé + questions | **OUI** |
| 1 | Given/When/Then | `@specs` | Scénarios baseline + évolution | **OUI** |
| 2 | Test ROUGE | `@test` | Tests qui échouent | auto (jalon) |
| 3 | Architecture | `@architect` | Arbre + challenge GWT | **OUI** |
| 4 | Dev VERT | `@dev` | Code minimal qui passe | auto (jalon) |
| 5 | Revue qualité | `@review` | Checklist + plan de refacto | **OUI** |
| 6 | Résumé métier + nuances | Build | `## Résumé métier` + `SP-*` | **OUI** |
| 7 | DONE | Build | Renommage `DONE-<slug>.md` | auto |

**Après le commit de livraison** (hors étapes) : le Build propose de **compacter** le fichier clos (skill `compacter-feature`, § 5.5). On garde ce qui a une valeur d'apprentissage, on retire ce qui ne servait que pendant la réalisation ; la version de travail reste lisible via `git show`.

### 4.1 Règles structurantes

- **Anti-chaînage** : jamais deux étapes « à décision sémantique » (0, 1, 3, 5, 6) dans le même tour ; il faut un « go » explicite. Seuls les auto-gates 2→3 et 4→5 enchaînent automatiquement, et **seulement si le jalon est OK**.
- **TDD** : le code n'est écrit qu'après avoir vu les tests 🔴.
- **Test global** : réservé au Build, **une seule fois**, après que `## Progression` (lignes 0–5) est entièrement OK et que le plan de refacto de l'étape 5 est vide. Max 2 par feature.
- **Spec parallèle `SP-*`** (`.agents/specs/spec-parallele.md`) : les règles métier validées qui amendent le spec officiel **priment** dessus. Écrites uniquement par le Build à l'étape 6, après « go ».
- **Pauses** : l'agent s'arrête, présente le livrable, attend une réponse. « stop » / « pause » interrompt immédiatement toute action.
- **Suivi** : tout vit dans `.agents/feature/<slug>.md` (template `core/templates/feature.md`), notamment le tableau `## Progression`.

### 4.2 Les 6 subagents (`core/agents/*.md`)

| Agent | Étapes | Rôle | Permissions |
|---|---|---|---|
| `@specs` | 0-1 | Consulter la spec + rédiger les GWT | read, edit (.md) |
| `@doc` | hors workflow | Questions métier (lecture seule) | read, glob, grep |
| `@test` | 2 | Écrire les tests | read, edit, shell |
| `@architect` | 3 | Proposer l'architecture + challenger | read, edit (.md) |
| `@dev` | 4 | Implémenter le code minimal | read, edit, bash |
| `@review` | 5 | Revue qualité + plan de refacto | read, bash, grep |

Ils ne s'invoquent **pas** entre eux : seul le Build orchestre. L'utilisateur peut aussi les appeler manuellement avec `@nom`.

### 4.3 Les 5 skills (`core/skills/*/SKILL.md`)

Chargées **à la demande** (via leur `description`), jamais systématiquement. Chaque skill est **invocable directement par l'utilisateur** : en la nommant en langage naturel, ou via sa **slash-commande** `/nom` (voir § 4.4).

- `consult-workflow` — pilote le lazy-loading du workflow. → `/consult-workflow`
- `cadrage-po` — patron PO amont (SPECS / BACKLOG / FICHE-REUNION). → `/cadrage-po`
- `analyse-flashback` — analyse du code à une date passée via tags prod. → `/analyse-flashback`
- `doc` — questions métier, réponse sourcée en 2 blocs. → `/doc`
- `compacter-feature` — compaction d'un fichier de feature clos après son commit de livraison. → `/compacter-feature`

### 4.4 Les 5 slash-commandes (`core/command/*.md`)

Chaque skill du kit dispose d'une **slash-commande** `/nom` : c'est le raccourci avec lequel l'utilisateur l'invoque directement. La commande charge la skill correspondante :

| Commande | Skill chargée |
|---|---|
| `/consult-workflow` | `consult-workflow` |
| `/cadrage-po` | `cadrage-po` |
| `/analyse-flashback` | `analyse-flashback` |
| `/doc` | `doc` |
| `/compacter-feature` | `compacter-feature` |

Elles prennent `$ARGUMENTS` et demandent la précision manquante si besoin.

### 4.5 Fichiers du projet (`.agents/`) et leur rôle

Fichiers-rôles **fixes** que le `core/` référence en dur :

`conventions.md`, `architecture.md`, `stack.md`, `commands.md`, `test-rules.md`, `ui-rules.md`, `component-rules.md`, `templates-index.md` (+ `templates/`).

Fichiers-mémoire :

`domain-glossary.md`, `specs/{spec.txt, spec-parallele.md, README.md}`, `reference-utilitaires.md`, `workflow-commands.md`, `feature/`, et les skills techno `skills/{tests,recette,migrate-fresh}/SKILL.md`.

---

## 5. Les skills expliquées, avec exemples

### 5.1 `consult-workflow` — lazy-loading du workflow

**But** : conserver la conscience projet sans tout charger (l'ancienne règle « lire tout le dossier » coûtait cher en contexte).

**Déclencheur** : « consulte le workflow », « charge le workflow », ou « je commence [feature] ».

**Ce qu'il charge toujours** (4 fichiers) :
1. `workflow-kit/core/index.md` — la carte de routage (qui lit quoi, quand) ;
2. `workflow-kit/core/agent-workflow.md` — les étapes, pauses, jalons ;
3. `workflow-kit/core/agent-build.md` — les règles du Build ;
4. `.agents/feature/<slug>.md` **actif** — l'état courant.

**Ce qu'il charge conditionnellement** : début de feature → `templates-index.md` ; avant un run de test → `.agents/skills/tests/SKILL.md` ; sinon selon la table de `index.md` et l'étape **en cours**.

**Ce qu'il ne charge JAMAIS** : les prompts `agents/*.md` (auto-injectés à la délégation), `ui-rules` / `component-rules`, `reference-utilitaires`, les `DONE-*`, les docs de chantier PO (`SPECS.md` / `BACKLOG.md` / `FICHE-REUNION.md`), les maquettes.

**Exemple** : « consulte le workflow, je démarre la feature remboursement ». Le Build charge les 4 fichiers + `templates-index.md`, puis travaille sur l'étape **en cours** du tableau Progression — pas les étapes futures.

### 5.2 `cadrage-po` — cadrer un sujet métier avant de coder

**But** : la phase **PO amont**, avant de découper un sujet en features exécutables.

**Déclencheur** : « je commence [sujet] » en mode cadrage, « mets en place le chantier PO », « prépare une réunion cliente sur [sujet] ».

**Le patron** : un **dossier de chantier** `<domaine>/<sujet>/` avec 3 fichiers :

| Fichier | Rôle | Public |
|---|---|---|
| `SPECS.md` | Référentiel consolidé (8 sections) | Cliente |
| `BACKLOG.md` | Roadmap des lots de dev + releases | Dev |
| `FICHE-REUNION.md` | Support de réunion brut | Cliente (réunion) |

**Le cœur** : le **système de questions Q**, avec un cycle de vie `[INCONNU]` → `[HYPOTHESE]` → `[VALIDE]`. Les Q sont détectées via 7 « lentilles » : grille CRUD × entités, marqueurs d'ambiguïté, diff spec↔code, analogies inter-domaines, grille des frontières, test des GWT, revue 3-amigos. Le DoD ne porte pas sur « on a toutes les Q » (impossible) mais sur « on a appliqué toutes les lentilles ».

**Flux** :

```
1. Cadrage PO            → SPECS (§3 règles, §4 US, §5 existant, §6 Q)
2. Réunion cliente       → FICHE-REUNION (décisions)
3. Consignation          → SPECS §6 (tags + décisions) + §8 (registre SP-*)
4. Report spec parallèle → .agents/specs/spec-parallele.md (sur « go »)
5. Choix du lot          → BACKLOG (releases)
6. Exécution             → .agents/feature/<slug>.md + workflow 0→7
```

**Exemple** : « je commence le cadrage du module abonnements ». La skill instancie les 3 templates, pose les questions par lentilles (ex. « que se passe-t-il si on supprime un abonné ? » → Q `[INCONNU]`), les tranche en réunion, puis les reporte en `SP-*` dans la spec parallèle.

**Garde-fous** : pas d'invention de règle (ambigu → `[INCONNU]` + question) ; pas de `SP-*` sans « go » ; `FICHE-REUNION.md` reste brut (la consignation se fait dans `SPECS §6`) ; les docs de chantier ne sont **jamais** préchargés.

### 5.3 `analyse-flashback` — diagnostiquer un ticket antidaté

**But** : comprendre le code **tel qu'il était** à une date passée, quand un comportement s'est produit à une date antérieure.

**Déclencheur / exemple typique** : « une facture n'est pas passée au mois d'août alors qu'on est en octobre ».

**Garde-fous** :
1. **Lecture seule** : `git show`, jamais de checkout ni de création de branche.
2. Alerter si la date fournie est **postérieure au dernier tag**.
3. Alerter si **aucun tag** de production n'existe.

**Workflow** :

1. Déterminer la date cible (mois seul → dernier jour du mois ; date floue → demander).
2. Trouver le tag prod le plus récent ≤ date cible : `git tag --sort=-creatordate`.
3. Lister / lire le code depuis le tag : `git ls-tree -r --name-only <tag>`, `git show <tag>:<path>`.
4. Comprendre la logique métier de l'époque.
5. Comparer avec maintenant : `git diff <tag>..HEAD -- <path>`, `git log <tag>..HEAD --oneline -- <path>`.
6. Produire un diagnostic structuré : Contexte / Code à cette date / Changements depuis / Hypothèse.

### 5.4 `doc` — répondre à une question métier, sourcée

**But** : répondre aux questions clientes / « comment ça marche X ? », **sans toucher au code**.

**Sources**, dans l'ordre de primauté :
1. `.agents/specs/spec-parallele.md` (les `SP-*` **priment** sur le spec officiel) ;
2. `.agents/specs/spec.txt` (spec officiel — **jamais** le PDF) ;
3. `.agents/domain-glossary.md` (définitions d'entités).

**Format obligatoire — deux blocs** :

```markdown
**Ce que dit la spec** *(officiel)* :
- <règle/flux en langage métier> — réf. <section, p. X>
- Si le spec ne traite pas le point : « La spec ne traite pas ce point. »

**Ce qui a été ajouté aux specs** *(spec parallèle)* :
- `SP-XXX` (validé YYYY-MM-DD) : <règle ajoutée/amendée, langage métier>
- Si aucun amendement : « Aucun ajout — la spec officielle fait foi. »
```

**Exemple** : « comment sont calculés les frais de dossier ? » → bloc 1 cite la page du spec officiel, bloc 2 signale un `SP-012` qui amende ce calcul.

**Règles** : pas de mélange entre les deux blocs ; incertitude → une seule ligne `⚠️ Zone d'ombre : …` ; règle durable non consignée → terminer par `[À CONSIGNER]` ; **aucune invention**. **Interdits** : modifier un fichier, lire le PDF, dumper le `.txt` entier, lancer une commande.

### 5.5 `compacter-feature` — dépolluer un fichier de feature clos

**But** : un `DONE-*` (ou `ABANDON-*`, `IRREPRODUCTIBLE-*`) garde par défaut tout le document de travail. La skill le réduit à ce qui **sert encore aux agents après coup**, sans perte : git conserve la version de travail.

**On garde** : le pourquoi (ADR, registre des décisions datées), le comportement garanti (scénarios GWT), le parcours dans le code (arbre de flux), la dette connue, les leçons de réalisation, les vigilances résiduelles, la recette manuelle.

**On retire** : le pilotage (Progression, texte des questions, contrat, fichiers prévus, checklists, revue) et les **copies** d'une source qui fait foi (spec parallèle, fichiers-rôles, référence des utilitaires, backlog), qui deviennent fausses quand la source évolue.

**Garde-fous** : jamais avant le commit de livraison ; identifiants cités ailleurs préservés ; rien de transversal supprimé sans être consigné ailleurs ; nom de fichier inchangé ; diff validé par l'utilisateur, commit séparé sur demande explicite.

**Mécanique / jugement** : `workflow-kit compact <fichier>` écrit le squelette (sections reprises recopiées à l'octet près, sections à rédiger marquées `[À COMPLÉTER]`, résiduel et renvois externes listés) ; l'agent rédige les sections marquées ; `workflow-kit compact <fichier> --check` bloque toute section reprise modifiée ou incomplète.

**Exemple** : « compacte DONE-paiement-par-lot ». Le script produit le squelette, l'agent rédige dette, vigilances et traçabilité à partir du résiduel, le contrôle passe, puis le diff est présenté.

---

## 6. Aide-mémoire

| Je veux… | Faire |
|---|---|
| Comprendre le kit | lire `README.md` puis ce guide |
| Installer sur un nouveau projet | `workflow-kit init` |
| Mettre à jour les seeds après un pull | `workflow-kit sync` |
| Comprendre ce qui se met à jour tout seul | `docs/mise-a-jour.md` |
| Démarrer une feature | « je commence [feature] » ou `/consult-workflow` |
| Cadrer un sujet métier (PO) | `/cadrage-po [sujet]` |
| Diagnostiquer un ticket antidaté | `/analyse-flashback [date/domaine]` |
| Poser une question métier | `/doc [question]` |
| Dépolluer un fichier de feature clos | `/compacter-feature [fichier]` |
| Auditer le kit (agnostisme, neutralité) | `workflow-kit verify` |
| Créer un nouveau pack techno | copier `packs/_blank/`, remplir, voir `packs/_schema.md` |
