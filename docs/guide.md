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

### 2.1 Les trois couches

Le kit sépare trois choses qui ne doivent jamais se mélanger :

```
workflow-kit/                    (dépôt git IMBRIQUÉ, ignoré par le projet)
├─ core/          → monté en LIEN sur  <projet>/.opencode   (AGNOSTIQUE : techno + projet)
├─ packs/<stack>/ → copié dans        <projet>/.agents/     (TECHNO : Laravel, React…)
├─ project/       → copié dans        <projet>/.agents/     (GÉNÉRIQUE : glossaire, specs)
├─ scripts/       → installation (init / bootstrap)
├─ tools/         → audit (verify-kit)
└─ docs/          → documentation du kit (ce fichier, mise-a-jour.md)
```

Et côté projet consommateur :

```
<projet>/
├─ workflow-kit/            # le kit, gitignore par le projet
├─ .opencode  ──► workflow-kit/core   # SYMLINK (Linux) / JUNCTION (Windows)
├─ .agents/                 # COMMITÉ : conventions, glossaire, specs, templates…
├─ AGENTS.md                # COMMITÉ
└─ opencode.json            # COMMITÉ : permissions subagents + instructions
```

### 2.2 Ce que veut dire « agnostique »

- **`core/` ne connaît ni la techno ni le métier.** Il parle de **rôles génériques** : « le fichier de conventions », « la stack », « le spec officiel ». Il référence des **noms de fichiers fixes** (interface stable : `conventions.md`, `architecture.md`, `stack.md`…) mais jamais leur contenu. Chaque projet les remplit à sa façon.
- **`packs/<stack>/` ne connaît que la techno, jamais le métier.** Le pack `laravel-livewire/` décrit Laravel/Livewire/PHPUnit, mais aucun nom d'entité métier.
- **`project/` est générique à tout projet** : glossaire, spec, spec parallèle, `AGENTS.md`.

> **Règle d'or :** le kit ne contient jamais de contenu propre à un projet, et un pack ne contient jamais de métier. Le `core/` est en plus agnostique de la techno.

### 2.3 Le modèle « kit imbriqué + lien »

- `workflow-kit/` est un **dépôt git imbriqué**, ignoré par le projet. On le met à jour avec `git -C workflow-kit …`.
- `.opencode` est un **lien** vers `workflow-kit/core`. Conséquence : le contenu agnostique (index, agents, skills, commandes, templates) est **LIVE**. On édite `core/`, le projet suit — pas de copie à rafraîchir.
- Le **projet ne commite que ce qui lui est propre** : `.agents/`, `AGENTS.md`, `opencode.json`, `.gitignore`. Rien d'agnostique.

Contraste à retenir :

| | `.opencode` | `.agents/` |
|---|---|---|
| Nature | lien → `workflow-kit/core` | copie matérialisée |
| Contenu | agnostique | propre au projet |
| Commitée ? | non (gitignore) | oui |
| Mise à jour | live (pull du kit) | relancer le script si le seed change |

---

## 3. Installation : comment et ce que ça fait

### 3.1 Point d'entrée

- **Nouveau projet** : `scripts/init.ps1` (interactif si les paramètres manquent).
- **Matérialisation seule** (mise à jour des seeds) : `scripts/bootstrap.ps1` (Windows) ou `scripts/bootstrap.sh` (Linux/macOS).

Exemple :

```powershell
./scripts/init.ps1 -Target C:\www\mon-projet -Stack laravel-livewire -Name mon-projet -KitRepo http://gogs.../workflow-kit.git
```

### 3.2 Ce que fait l'installation, dans l'ordre

1. **Clone le kit** dans `<projet>/workflow-kit/` (sinon copie locale sans `.git`), et l'ajoute au `.gitignore` du projet avec `.opencode/`.
2. **Crée le lien** `.opencode` → `workflow-kit/core` (junction Windows / symlink Linux).
3. **Matérialise les seeds** : `packs/<stack>/agents/**` + `project/agents/**` → `.agents/`, et `project/AGENTS.md` → `AGENTS.md`.
4. **Fusionne `opencode.json`** : ajoute les permissions `agent.build.permission.task` (autorise le Build à invoquer les 6 subagents) et `instructions: [".agents/workflow-commands.md"]` (commandes techno toujours en contexte). Le reste (`plugin`, `mcp`) est préservé.
5. **Crée `.agents/feature/`** et affiche la checklist post-installation.

### 3.3 Sécurité d'écrasement

| Zone | Emplacement | Si la cible existe déjà |
|---|---|---|
| **Agnostique** | `.opencode` (lien vers `workflow-kit/core`) | live, jamais copié |
| **Projet** | `.agents/**`, `AGENTS.md` | **jamais écrasé** : la version du kit part en quarantaine dans `.agents/doublons/` |

- `-Force` (ou `-OnConflict Overwrite`) écrase aussi les fichiers projet.
- `.agents/doublons/` reste visible dans `git status` (à traiter à la main, puis supprimer).
- `CLAUDE.md` n'est **jamais** une cible.

### 3.4 Après l'installation (manuel)

- Remplir `.agents/domain-glossary.md`, `conventions.md`, `architecture.md`, `stack.md`, `commands.md`.
- Déposer les specs officielles dans `.agents/specs/spec.txt`.
- Si stack `_blank` : compléter `.agents/` puis créer/adopter un pack.

### 3.5 Mise à jour du kit

```powershell
git -C workflow-kit fetch
git -C workflow-kit pull
```

- `core/` a bougé → rien à faire côté fichiers, mais repartir sur une **nouvelle session opencode** (config, agents, skills et commandes sont lus au démarrage).
- `packs/`, `project/` ou `opencode.agent.json` ont bougé → relancer `bootstrap.ps1`.

Détails, nuances et pièges : `docs/mise-a-jour.md`.

---

## 4. Le workflow d'une feature (étapes 0→7)

Orchestré par l'agent **Build** (agent principal), qui délègue chaque étape à un **subagent** via le tool `Task`.

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

### 4.3 Les 4 skills (`core/skills/*/SKILL.md`)

Chargées **à la demande** (via leur `description`), jamais systématiquement. Chaque skill est **invocable directement par l'utilisateur** : en la nommant en langage naturel, ou via sa **slash-commande** `/nom` (voir § 4.4).

- `consult-workflow` — pilote le lazy-loading de `.opencode`. → `/consult-workflow`
- `cadrage-po` — patron PO amont (SPECS / BACKLOG / FICHE-REUNION). → `/cadrage-po`
- `analyse-flashback` — analyse du code à une date passée via tags prod. → `/analyse-flashback`
- `doc` — questions métier, réponse sourcée en 2 blocs. → `/doc`

### 4.4 Les 4 slash-commandes (`core/command/*.md`)

Chaque skill du kit dispose d'une **slash-commande** `/nom` : c'est le raccourci avec lequel l'utilisateur l'invoque directement. La commande charge la skill correspondante :

| Commande | Skill chargée |
|---|---|
| `/consult-workflow` | `consult-workflow` |
| `/cadrage-po` | `cadrage-po` |
| `/analyse-flashback` | `analyse-flashback` |
| `/doc` | `doc` |

Elles prennent `$ARGUMENTS` et demandent la précision manquante si besoin.

### 4.5 Fichiers du projet (`.agents/`) et leur rôle

Fichiers-rôles **fixes** que le `core/` référence en dur :

`conventions.md`, `architecture.md`, `stack.md`, `commands.md`, `test-rules.md`, `ui-rules.md`, `component-rules.md`, `templates-index.md` (+ `templates/`).

Fichiers-mémoire :

`domain-glossary.md`, `specs/{spec.txt, spec-parallele.md, README.md}`, `reference-utilitaires.md`, `workflow-commands.md`, `feature/`, et les skills techno `skills/{tests,recette,migrate-fresh}/SKILL.md`.

---

## 5. Les skills expliquées, avec exemples

### 5.1 `consult-workflow` — lazy-loading de `.opencode`

**But** : conserver la conscience projet sans tout charger (l'ancienne règle « lire tout le dossier » coûtait cher en contexte).

**Déclencheur** : « consulte .opencode », « va voir dans .opencode », « lis .opencode », ou « je commence [feature] ».

**Ce qu'il charge toujours** (4 fichiers) :
1. `.opencode/index.md` — la carte de routage (qui lit quoi, quand) ;
2. `.opencode/agent-workflow.md` — les étapes, pauses, jalons ;
3. `.opencode/agent-opencode.md` — les règles du Build ;
4. `.agents/feature/<slug>.md` **actif** — l'état courant.

**Ce qu'il charge conditionnellement** : début de feature → `templates-index.md` ; avant un run de test → `.agents/skills/tests/SKILL.md` ; sinon selon la table de `index.md` et l'étape **en cours**.

**Ce qu'il ne charge JAMAIS** : les prompts `agents/*.md` (auto-injectés par `Task`), `ui-rules` / `component-rules`, `reference-utilitaires`, les `DONE-*`, les docs de chantier PO (`SPECS.md` / `BACKLOG.md` / `FICHE-REUNION.md`), les maquettes.

**Exemple** : « consulte .opencode, je démarre la feature remboursement ». Le Build charge les 4 fichiers + `templates-index.md`, puis travaille sur l'étape **en cours** du tableau Progression — pas les étapes futures.

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

---

## 6. Aide-mémoire

| Je veux… | Faire |
|---|---|
| Comprendre le kit | lire `README.md` puis ce guide |
| Installer sur un nouveau projet | `scripts/init.ps1` |
| Mettre à jour les seeds après un pull | `scripts/bootstrap.ps1` (-Mode Link) |
| Comprendre ce qui se met à jour tout seul | `docs/mise-a-jour.md` |
| Démarrer une feature | « je commence [feature] » ou `/consult-workflow` |
| Cadrer un sujet métier (PO) | `/cadrage-po [sujet]` |
| Diagnostiquer un ticket antidaté | `/analyse-flashback [date/domaine]` |
| Poser une question métier | `/doc [question]` |
| Auditer le kit (agnostisme, neutralité) | `tools/verify-kit.ps1` |
| Créer un nouveau pack techno | copier `packs/_blank/`, remplir, voir `packs/_schema.md` |
