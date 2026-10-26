# Guide du workflow-kit

> Public : toute personne qui découvre le kit (dev, PO, QA).
> But : comprendre ce qu'il y a dans `workflow-kit/`, comment on l'installe, et comment on travaille au quotidien.
> Aucune connaissance préalable de la stack n'est nécessaire pour lire ce document.

---

## 1. À quoi sert le kit ?

Le workflow-kit apporte, à **n'importe quel projet** et **n'importe quelle stack**, une même façon de travailler :

- un **workflow de feature en 8 étapes** (0→7), avec TDD strict et pauses de validation ;
- **deux agents principaux** — le raffineur (étapes 0-1) et le Build (étapes 2-7) — et **6 subagents spécialisés** (doc, explorateur, challenger, tests, dev, revue) ;
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
- **Contrôle d'un fichier de feature** : `check <fichier>` ; fichiers meta du projet seuls : `check-meta` (skill `controle-livraison`).
- **Compaction d'un fichier de feature clos** : `compact <fichier>` (skill `compacter-feature`).

Exemple :

```bash
node workflow-kit/bin/workflow-kit.mjs init --target C:\www\mon-projet --stack laravel-livewire --name mon-projet --runtime both --kit-repo http://gogs.../workflow-kit.git
```

Si le kit n'est pas encore dans le projet, lancer la commande depuis une copie du kit ; `init` le place dans `<projet>/workflow-kit/`.

### 3.2 Ce que fait l'installation, dans l'ordre

1. **Place le kit** dans `<projet>/workflow-kit/` (clone, sinon copie locale sans `.git`) et enregistre la stack et les runtimes dans `workflow.config.json`.
2. **Matérialise les seeds** : `packs/<stack>/agents/**` + `project/agents/**` → `.agents/`, et `project/AGENTS.md` → `AGENTS.md`.
3. **Génère les adaptateurs** demandés :
   - `opencode` : `.opencode/{agents,command,skills}` et fusion de `opencode.json` (permissions `agent.<agent principal>.permission.task` des subagents du Build et du raffineur, `instructions: [".agents/workflow-commands.md"]`). Le reste (`plugin`, `mcp`) est préservé.
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

Deux phases, chacune dans sa session. **Raffinement** (étapes 0-1) : l'utilisateur parle directement au **raffineur**, agent principal qui délègue la lecture des specs (`@doc`), du code (`@explorateur`) et la relecture à froid des GWT (`@challenger`). **Réalisation** (étapes 2-7) : l'agent **Build** délègue chaque étape à un **subagent** via l'outil de délégation (`Task` sous opencode, `Agent` sous Claude Code).

| # | Étape | Agent | Livrable | Pause |
|---|---|---|---|---|
| 0 | Compréhension | raffineur (+ `@doc`, `@explorateur`) | Synthèse spec / code + questions | **OUI** |
| 1 | Given/When/Then + challenge | raffineur (+ `@challenger`) | Scénarios + edge cases + écarts arbitrés | **OUI** |
| 2 | Test ROUGE | `@test` | Tests qui échouent | auto (jalon) |
| 3 | Plan | `@dev` | Arbre de flux + fichiers + choix + signatures publiques | **OUI** |
| 4 | Dev VERT | `@dev` (repris) | Code minimal qui passe + écarts au plan | auto (jalon) |
| 5 | Revue qualité | `@review` | Checklist + plan de refacto + décisions techniques | **OUI** |
| 6 | Résumé métier + nuances | Build | `## Résumé métier` + `SP-*` | **OUI** |
| 7 | DONE | Build | Renommage `DONE-<slug>.md` | auto |

**Après le commit de livraison** (hors étapes) : le Build propose de **compacter** le fichier clos (skill `compacter-feature`, § 5.5). On garde ce qui a une valeur d'apprentissage, on retire ce qui ne servait que pendant la réalisation ; la version de travail reste lisible via `git show`.

### 4.1 Mener une feature, pas à pas

Le fichier `.agents/feature/<slug>.md` fait le lien entre les deux sessions : chacune y lit l'état (`## Progression`) et y écrit son travail.

**1. Ouvrir une session de raffinement**

| Outil | Comment |
|---|---|
| Partout (application de bureau, IDE, terminal, opencode) | `/raffiner [feature]` : l'agent principal endosse le rôle du raffineur |
| Terminal Claude Code | ou `claude --agent raffineur`, puis « je commence [feature] » |
| opencode | ou l'agent `raffineur` choisi avec **Tab**, puis « je commence [feature] » |

Pour une feature issue d'un cadrage PO : « le lot X du chantier Y » à la place du nom. Le raffineur crée le fichier et charge la phase raffinement.

Lancée sur l'agent `raffineur`, la session a ses outils restreints par l'outil (pas de code, pas de test) ; par `/raffiner`, l'agent garde ses outils et ces limites tiennent par la règle.

**2. Raffiner (étapes 0-1), en conversation**

- **Compréhension** : le raffineur interroge `@doc` (spec, spec parallèle, glossaire) et `@explorateur` (code, tests, contraintes), puis s'arrête sur une synthèse : ce que dit la spec, ce que fait le code, les questions bloquantes (**arrêt 1**).
- **Rédaction** : GWT et edge cases écrits avec toi ; le raffineur relance une recherche ciblée dès qu'un point est contesté.
- **Challenge** : `@challenger` relit les GWT contre le code ; tu arbitres chaque écart.
- **Gel** : contrôle de la Definition of Ready, puis ta validation (**arrêt 2**). Le raffineur annonce que le fichier est prêt.

**3. Ouvrir une session de réalisation**

Une **nouvelle** session sur l'agent par défaut (le Build) : opencode, l'agent `build` ; Claude Code, application de bureau ou `claude`. Puis : `/realiser [feature]`. La skill vérifie que le raffinement est gelé (Progression, contrôle de la Definition of Ready), puis charge le socle et la phase réalisation.

**4. Réaliser (étapes 2-7)**

- **Tests rouges** (`@test`), puis enchaînement automatique sur le **plan** de `@dev` : tu le valides (**pause 3**).
- **Code vert** (`@dev` repris) : un écart mineur au plan est déclaré, un écart majeur l'arrête et te revient.
- **Revue** (`@review`) : plan de refacto éventuel et **récapitulatif technique** (utilitaires, conventions) — tu contestes ce que tu veux, le reste est accepté (**pause 5**).
- **Clôture** (Build) : test global, résumé métier et nuances `SP-*` (**pause 6**), passage DONE, proposition de commit puis de compaction.

**Trou métier pendant la réalisation** (comportement que les GWT ne spécifient pas) : retour au raffineur sur le seul point en question — `/raffiner` dans une nouvelle session, ou rebasculer sur `raffineur` avec Tab (opencode), ou `claude --agent raffineur`. Il met les GWT à jour et refait un gel limité ; la réalisation reprend dans une nouvelle session (`/realiser [feature]`), à `@test` sur les scénarios touchés. Une simple formulation se corrige sur place par le Build.

**Reprendre une feature** dans une nouvelle session : `/raffiner [feature]` ou `/realiser [feature]` selon sa phase. Si tu ne sais plus où elle en est : « consulte le workflow » — il lit la Progression et te dit quelle commande lancer, sans rien démarrer.

### 4.2 Règles structurantes

- **Anti-chaînage** : jamais deux étapes « à décision sémantique » (0, 1, 3, 5, 6) dans le même tour ; il faut un « go » explicite. Seuls les auto-gates 2→3 et 4→5 enchaînent automatiquement, et **seulement si le jalon est OK**.
- **TDD** : le code n'est écrit qu'après avoir vu les tests 🔴.
- **Une conversation reste là où est son contexte** : les specs se discutent avec le raffineur (session de raffinement), jamais par l'intermédiaire du Build.
- **Plan validé** (pause 3) : `@dev` déclare ses écarts mineurs dans `### Écarts au plan` ; un écart majeur (fichier ou couche non prévu, signature publique modifiée, réutilisation abandonnée) l'arrête et passe par toi.
- **Métier / technique** : tu tranches le métier un à un (spec parallèle, glossaire) ; l'équipe tranche le technique (utilitaires, conventions), récapitulé à la pause 5 et accepté sauf contestation.
- **Test global** : réservé au Build, **une seule fois**, après que `## Progression` (lignes 0–5) est entièrement OK et que le plan de refacto de l'étape 5 est vide. Max 2 par feature.
- **Spec parallèle `SP-*`** (`.agents/specs/spec-parallele.md`) : les règles métier validées qui amendent le spec officiel **priment** dessus. Écrites uniquement par le Build à l'étape 6, après « go ».
- **Pauses** : l'agent s'arrête, présente le livrable, attend une réponse. « stop » / « pause » interrompt immédiatement toute action.
- **Suivi** : tout vit dans `.agents/feature/<slug>.md` (template `core/templates/feature.md`), notamment le tableau `## Progression`.

### 4.3 Les agents (`core/agents/*.md`)

| Agent | Étapes | Rôle | Permissions |
|---|---|---|---|
| raffineur (agent principal) | 0-1 | Mener le raffinement avec l'utilisateur, rédiger les GWT | read, edit (.md), task, shell (contrôle), web (ciblé, sourcé) |
| `@doc` | 0-1 (mode raffinement) + hors workflow | Specs, spec parallèle, glossaire (lecture seule) | read, glob, grep |
| `@explorateur` | 0 | Faits sur le code existant (lecture seule) | read, glob, grep |
| `@challenger` | 1 | Écarts entre les GWT et le code (lecture seule) | read, glob, grep |
| `@test` | 2 | Écrire les tests | read, edit, shell |
| `@dev` | 3-4 | Rédiger le plan, puis implémenter le code minimal | read, edit, bash |
| `@review` | 5 | Revue qualité + plan de refacto + récapitulatif technique | read, bash, grep |

Ils ne s'invoquent **pas** entre eux : seul l'agent principal de la session (raffineur ou Build) orchestre. L'utilisateur peut aussi les appeler manuellement avec `@nom`.

### 4.4 Les 8 skills (`core/skills/*/SKILL.md`)

Chargées **à la demande** (via leur `description`), jamais systématiquement. Chaque skill est **invocable directement par l'utilisateur** : en la nommant en langage naturel, ou via sa **slash-commande** `/nom` (voir § 4.5).

- `consult-workflow` — socle commun du lazy-loading ; seul, dit où en est une feature et quelle commande lancer. → `/consult-workflow`
- `raffiner` — fait endosser le rôle du raffineur à l'agent principal (session non lancée sur l'agent raffineur). → `/raffiner`
- `realiser` — point d'entrée de la réalisation : garde-fous, socle et phase réalisation. → `/realiser`
- `cadrage-po` — patron PO amont (SPECS / BACKLOG / FICHE-REUNION). → `/cadrage-po`
- `analyse-flashback` — analyse du code à une date passée via tags prod. → `/analyse-flashback`
- `doc` — questions métier, réponse sourcée en 2 blocs. → `/doc`
- `compacter-feature` — compaction d'un fichier de feature clos après son commit de livraison. → `/compacter-feature`
- `controle-livraison` — contrôle mécanique d'un fichier de feature (Progression, Definition of Ready, traces non tranchées, fichiers meta). → `/controle-livraison`

### 4.5 Les 8 slash-commandes (`core/commands/*.md`)

Chaque skill du kit dispose d'une **slash-commande** `/nom` : c'est le raccourci avec lequel l'utilisateur l'invoque directement. La commande charge la skill correspondante :

| Commande | Skill chargée |
|---|---|
| `/consult-workflow` | `consult-workflow` |
| `/raffiner` | `raffiner` |
| `/realiser` | `realiser` |
| `/cadrage-po` | `cadrage-po` |
| `/analyse-flashback` | `analyse-flashback` |
| `/doc` | `doc` |
| `/compacter-feature` | `compacter-feature` |
| `/controle-livraison` | `controle-livraison` |

Elles prennent `$ARGUMENTS` et demandent la précision manquante si besoin.

### 4.6 Fichiers du projet (`.agents/`) et leur rôle

Fichiers-rôles **fixes** que le `core/` référence en dur :

`conventions.md`, `architecture.md`, `stack.md`, `commands.md`, `test-rules.md`, `ui-rules.md`, `component-rules.md`, `templates-index.md` (+ `templates/`).

Fichiers-mémoire :

`domain-glossary.md`, `specs/{spec.txt, spec-parallele.md, README.md}`, `reference-utilitaires.md`, `workflow-commands.md`, `feature/`, et les skills techno `skills/{tests,recette,migrate-fresh}/SKILL.md`.

---

## 5. Les skills expliquées, avec exemples

### 5.1 `consult-workflow`, `raffiner`, `realiser` — lazy-loading par phase

**But** : conserver la conscience projet sans tout charger. Chaque session ne lit que le **socle** commun et **sa** phase.

```
SOCLE (consult-workflow)            index.md · agent-workflow.md · agent-build.md · feature active (par sections)
  ├─ /raffiner [feature]   (raffiner) → + phase-raffinement.md + rôle du raffineur
  └─ /realiser [feature]   (realiser) → + phase-realisation.md (après garde-fous : session neuve,
                                          raffinement gelé, Definition of Ready)
```

**« Consulte le workflow » seul** : charge le socle, lit la Progression et dit **où en est la feature et quelle commande lancer** — sans charger de phase ni changer de rôle.

**Ce qui se charge conditionnellement** : avant un run de test → `.agents/skills/tests/SKILL.md` ; sinon selon la table de `index.md` et l'étape **en cours**.

**Ce qui ne se charge JAMAIS** : les prompts `agents/*.md` (auto-injectés à la délégation ; seule exception, `raffineur.md` lu par `raffiner`), la phase qui n'est pas celle de la session, `ui-rules` / `component-rules`, `reference-utilitaires` en entier, les `DONE-*`, les docs de chantier PO (`SPECS.md` / `BACKLOG.md` / `FICHE-REUNION.md`), les maquettes.

**Exemple** : `/raffiner remboursement` — le socle, `phase-raffinement.md`, le rôle du raffineur. Plus tard, dans une **nouvelle** session, `/realiser remboursement` — le socle et `phase-realisation.md` ; le Build reprend à l'étape 2. Chacun travaille sur l'étape **en cours** du tableau Progression — pas les étapes futures.

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

**Mécanique / jugement** : `workflow-kit compact <fichier>` écrit le squelette (sections reprises recopiées à l'octet près, sections à rédiger marquées `[À COMPLÉTER]`, résiduel, blocs libres et renvois externes listés) ; l'agent rédige les sections marquées et tranche chaque bloc libre (gardé, ou cité avec son motif dans la ligne « Écarté à la compaction ») ; `workflow-kit compact <fichier> --check` bloque toute section reprise modifiée ou incomplète, tout arbre de flux absent et tout bloc libre non tranché.

**Pourquoi c'est fiable** : ce qui se garde a un **emplacement fixe dans le gabarit de feature**, rempli pendant la réalisation (`## Registre des décisions` tenu par l'agent principal à chaque pause, `## Clé de lecture des scénarios` par le raffineur, `### Arbre de flux` par `@dev` dans le plan) ; un arbre écrit ailleurs est repéré par son contenu ; ce que le gabarit ne prévoit pas doit être tranché explicitement.

**Exemple** : « compacte DONE-paiement-par-lot ». Le script produit le squelette, l'agent rédige dette, vigilances et traçabilité à partir du résiduel, le contrôle passe, puis le diff est présenté.

---

## 6. Aide-mémoire

| Je veux… | Faire |
|---|---|
| Comprendre le kit | lire `README.md` puis ce guide |
| Installer sur un nouveau projet | `workflow-kit init` |
| Mettre à jour les seeds après un pull | `workflow-kit sync` |
| Comprendre ce qui se met à jour tout seul | `docs/mise-a-jour.md` |
| Démarrer une feature | `/raffiner [feature]` (partout), ou session lancée sur `raffineur` puis « je commence [feature] » |
| Passer à la réalisation | nouvelle session, puis `/realiser [feature]` |
| Reprendre une feature | `/raffiner` ou `/realiser` selon sa phase ; « consulte le workflow » pour savoir laquelle |
| Contrôler une feature | `/controle-livraison` (ou `workflow-kit check <fichier>`) |
| Cadrer un sujet métier (PO) | `/cadrage-po [sujet]` |
| Diagnostiquer un ticket antidaté | `/analyse-flashback [date/domaine]` |
| Poser une question métier | `/doc [question]` |
| Dépolluer un fichier de feature clos | `/compacter-feature [fichier]` |
| Auditer le kit (agnostisme, neutralité) | `workflow-kit verify` |
| Créer un nouveau pack techno | copier `packs/_blank/`, remplir, voir `packs/_schema.md` |
