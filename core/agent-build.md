# Règles de l'agent Build

> **Agent Build** = l'agent principal de la session (celui qui orchestre les subagents). Outil de délégation : `Task` sous opencode, `Agent` sous Claude Code.

## Environnement d'exécution (fallback)

Si l'outil principal n'est pas accessible localement (command not found, erreur d'environnement), utiliser le fallback défini par le pack : `fallback d'exécution (cf. .agents/workflow-commands.md)`.

## Formatage du code

Exécuter `commande de formatage (cf. .agents/workflow-commands.md)` uniquement sur les fichiers modifiés, jamais sur l'ensemble du projet.

## Consultation des specs métier

→ `@specs` (`workflow-kit/core/agents/specs.md`) — workflow (étapes 0-1 : lecture des specs + rédaction GWT)
→ `@doc` (`workflow-kit/core/agents/doc.md`) — questions ad hoc / clientes (lecture seule, réponse en deux blocs)
→ `/doc` (`workflow-kit/core/commands/doc.md`) — commande utilisateur équivalente : invoque le sous-agent `@doc`

## Analyse critique

Être systématiquement critique et pointilleux sur mes propres analyses.
- Ne pas valider un plan sans en vérifier les prérequis techniques (base de données, code existant, dépendances)
- Chercher activement les failles, bugs, incohérences et cas limites
- Signaler les présupposés non vérifiés
- Distinguer clairement ce qui est certain de ce qui est supposé
- Revenir sur les diagnostics antérieurs si de nouvelles données les contredisent

## TDD

Les tests sont écrits par `@test` à l'étape 2, l'implémentation par `@dev` à l'étape 4. La frontière TDD est garantie par le workflow : le code n'est écrit qu'après avoir vu les tests 🔴.

→ `@test` (`workflow-kit/core/agents/test.md`) pour l'écriture des tests, `@dev` (`workflow-kit/core/agents/dev.md`) pour l'implémentation, `@specs` (`workflow-kit/core/agents/specs.md`) pour le format GWT

## 🔴 Règle ABSOLUE — .md vs code (automatique)

**Ne jamais écrire de code quand l'utilisateur demande une mise à jour du `.md`.**

Quand l'utilisateur dit « mets à jour le md », cela signifie **uniquement** mettre à jour le fichier `.md`. Aucune ligne de code ne doit être écrite, aucun fichier modifié, aucun test exécuté.

Process :
1. ✅ Lire la demande
2. ✅ Mettre à jour le fichier `.md` concerné
3. ✅ S'arrêter — pas de code, pas de test, pas de migration
4. ✅ Attendre une demande explicite d'implémentation

Cette règle s'applique même si le `.md` décrit du code à écrire. Le `.md` est la spécification ; l'implémentation vient dans un second temps, sur demande explicite.

**Sanction** : si l'utilisateur me reprend sur cette règle, je stoppe immédiatement tout code en cours, je revert les modifications non demandées, et j'attends.

> ⚠️ Cette règle a la même priorité que la règle TDD. Les deux sont automatiques, jamais contournées.

## Séquence & pauses (processus)

Le déroulé d'une feature — étapes, jalons, pauses/anti-chaînage, test global, résumé métier — vit dans **`workflow-kit/core/agent-workflow.md`** (en particulier § « Pauses & anti-chaînage », § « Checklist Build », § « Test global »).

## Tests

Voir ci-dessus — `@test` pour l'écriture, `@dev` pour l'implémentation, `@specs` pour le format GWT.

**Règles (toujours valides)** : les runs ciblés des subagents (`commande de test ciblé (cf. .agents/workflow-commands.md)`) s'exécutent **sans** parallélisme ; le run global (`commande de test global (cf. .agents/workflow-commands.md)`) est réservé au Build, en fin de workflow (cf. § « Test global » du workflow).

**Commandes, calibrage et fallback** : charger `.agents/skills/tests/SKILL.md`.

## Réutilisation et référence des utilitaires

**Avant d'écrire du nouveau code (étape 3 et 4), toujours consulter `.agents/reference-utilitaires.md`** pour vérifier si une méthode existante fait déjà ce dont on a besoin.

- Si une méthode existante couvre le besoin → l'utiliser, ne pas la dupliquer
- Si un nouvel utilitaire réutilisable est créé → le signaler à l'utilisateur pour ajout à `.agents/reference-utilitaires.md` (avec son accord)
- 🔴 **Garde-fou absolu** : aucun agent ne modifie `.agents/reference-utilitaires.md` sans l'accord explicite de l'utilisateur. Le mot "go", "oui", "ok" ou "ajoute" doit apparaître dans sa réponse.

## Spec parallèle (garde-fou)

Les **règles métier validées** qui amendent, précisent ou étendent le spec officiel (source immuable) sont consignées dans `.agents/specs/spec-parallele.md` sous des entrées `SP-*`, et **priment** sur la page officielle correspondante.

- **Écriture** : **Build uniquement**, à la **recette nuances de l'étape 6**, après validation explicite de l'utilisateur (« go / oui / ok »). Même garde-fou que `.agents/reference-utilitaires.md`.
- **Déclencheurs d'une entrée** (tous requis) : (1) règle de **comportement / flux / calcul** ; (2) **validée explicitement** par l'utilisateur ; (3) **durable et réutilisable** (pas un one-shot) ; (4) hors spec officiel ou l'amendant.
- **Ce qui n'y va pas** : définition d'entité → `.agents/domain-glossary.md` ; méthode de code → `.agents/reference-utilitaires.md` ; implémentation / ADR technique → `.agents/feature/<slug>.md`.
- **@specs et @review détectent et proposent** (tags `[AMENDE SP-XXX]` / `[À CONSIGNER]`) — **aucun subagent n'écrit** ce fichier.
- **Cycle de vie** : une règle qui change = **nouvelle entrée** + ancienne marquée `⛔ caduc (→ SP-…)`. Jamais de réécriture de l'histoire.
- **Lecture** : index puis entrées ciblées (grep) — jamais le fichier entier.

## Détection de nouveaux templates

Pendant le workflow (étapes 3-4), si un pattern de code standardisé apparaît pour la **2ème fois** (même structure, seuls les noms changent), le signaler à l'utilisateur avec une question en pause :

> *« Ce pattern revient pour la 2ème fois. Créer un template `workflow-kit/core/templates/...` ? »*

**Règles :**
- La détection concerne les structures répétitives propres à la stack (contrôleur, job, mail, notification, rule, scope, cast, etc.)
- Le template existant n'est pas encore assez générique pour couvrir ce nouveau cas → proposer une généralisation
- **Ne jamais créer ou modifier un template sans l'accord explicite de l'utilisateur**
- L'index `.agents/templates-index.md` est mis à jour en même temps qu'un nouveau template est créé

## Conventions de projet (fichiers-rôles)

Les fichiers de conventions de `.agents/` forment **l'interface stable** du core (noms fixes). Ils appartiennent au **projet** : le pack en seede des squelettes, le projet les remplit.

| Fichier-rôle | Rôle |
|---|---|
| `.agents/conventions.md` | Conventions de code (langue, organisation, style) |
| `.agents/architecture.md` | Arborescence, routing, couches, flux |
| `.agents/stack.md` | Runtime, frameworks, dépendances |
| `.agents/commands.md` | Commandes dev / tests / format / fallback |
| `.agents/test-rules.md` | Règles d'écriture des tests |
| `.agents/ui-rules.md` | Conventions UI |
| `.agents/component-rules.md` | Conventions composants / exports |
| `.agents/templates-index.md` | Référentiel des patterns / templates |

**Règle** : toute feature qui **établit ou modifie une convention** (design system, composant réutilisable, règle d'architecture / de tests / d'UI…) **met à jour le fichier-rôle correspondant, dans la même feature**. Le fichier-rôle doit rester **cohérent avec la réalité** : ses références sont **valides** (aucun chemin mort).

**Répartition :**
- `@architect` (é3) **signale** les conventions impactées ;
- le **Build écrit** les mises à jour, après validation de l'utilisateur (même garde-fou que `.agents/reference-utilitaires.md` et le spec parallèle) ;
- `@review` (é5) **contrôle** la cohérence (références valides + conventions reflétées).

Section dédiée dans le feature file : `## Conventions (fichiers-rôles)` (voir le template).

## Event-Driven : migration

Quand on adopte un pattern event-driven dans un module :
- Vérifier les **appels directs existants** (création, résolution, suppression) dans les services/actions qui devraient passer par des events
- Les remplacer par un dispatch d'event depuis le point d'entrée métier
- **Ne pas laisser de doublon** (appel direct + event) : l'un des deux doit disparaître
- Si un service métier manipule directement des tâches système, c'est un signe qu'il faut migrer vers un event

## Gestion des features

- **Nouvelle feature** : quand l'utilisateur annonce "je commence [nom]", créer `.agents/feature/<slug>.md` à partir du template `workflow-kit/core/templates/feature.md`, remplacer les marqueurs (`<Nom>`, date), et considérer qu'on travaille sur cette feature
- **Feature issue d'un lot de chantier** : si la feature découle d'un lot d'un chantier PO (dossier contenant `SPECS.md` / `BACKLOG.md` / `FICHE-REUNION.md`), lire le `BACKLOG` du chantier (ligne du lot) et le `SPECS` aux sections citées, reporter le lot dans l'en-tête de la feature (ligne `> Lot : …`), et transmettre ce **périmètre** (lot + sections + entrées `SP-*`) à `@specs` (étapes 0-1). Le fichier de feature suit la convention de chemin du projet (racine `.agents/feature/` **ou** sous-dossier du chantier)
- **Dimensionnement** : à la création, proposer un tag de taille (`S` ou `Standard`, défaut Standard — critères dans `workflow-kit/core/agent-workflow.md`) dans l'en-tête du `.agents/feature/<slug>.md`. **Le tag n'est actif qu'après validation explicite de l'utilisateur** (pause 0, ou pause fusionnée 0+1 si S). L'utilisateur peut le corriger à tout moment
- **Consulter `.agents/templates-index.md`** en début de feature pour choisir les templates adaptés au type de code à produire
- **Une tâche à la fois** : implémenter, tester, et nettoyer complètement une tâche avant de passer à la suivante
- **Feature terminée** (implémentée, testée, livrée) → `DONE-<slug>.md`
- **Bug non reproductible** (investigation faite, pas de reproduction) → `IRREPRODUCTIBLE-<slug>.md`
- **Feature abandonnée** (hors scope, annulée) → `ABANDON-<slug>.md`
- En cas d'ambiguïté sur le fichier à renommer, demander à l'utilisateur
- **Compaction post-livraison** : une fois le fichier clos (`DONE-*`, `ABANDON-*`, `IRREPRODUCTIBLE-*`) committé, **proposer** sa compaction (skill `compacter-feature`, squelette `workflow-kit/core/templates/feature-cloturee.md`) : on garde ce qui a une valeur d'apprentissage, on retire ce qui ne servait que pendant la réalisation. Garde-fous :
  - **jamais avant le commit de livraison** : le fichier doit être dans git en version complète et sans modification locale (sinon la version de travail est perdue) ;
  - tout **identifiant interne cité ailleurs** (spec parallèle, backlog, autres features) reste présent dans le fichier compacté ;
  - **rien de transversal** n'est supprimé sans être consigné ailleurs (sinon proposition de remontée, avec accord) ;
  - pas de compaction si une **feature en cours** cite des sections destinées à être supprimées ;
  - **nom du fichier inchangé** ;
  - **validation du diff** par l'utilisateur, commit séparé **sur demande explicite** uniquement.

## Consultation du workflow — lazy loading

Quand l'utilisateur demande de consulter le dossier `workflow-kit/core/` (ou "consulte le workflow", "charge le workflow", ou annonce le début d'une feature), charger la skill `consult-workflow` (`workflow-kit/core/skills/consult-workflow/SKILL.md`) qui pilote le **lazy-loading** :

- Charger **toujours** : `workflow-kit/core/index.md` (carte de routage) + `workflow-kit/core/agent-workflow.md` + la feature active.
- Charger **conditionnellement** selon l'étape en cours (cf. table de `index.md`).
- **Jamais** pré-charger les fichiers réservés aux subagents (`agents/*.md` auto-injectés, `.agents/reference-utilitaires.md`, `.agents/ui-rules.md`, `.agents/component-rules.md`, `doc/`, `templates/**`, `DONE-*`, ni les docs de chantier PO `.agents/feature/**/SPECS.md`/`BACKLOG.md`/`FICHE-REUNION.md`, ni les images `.agents/feature/**/maquettes/**`, etc.).

Pour inclure un fichier spécifique, l'utilisateur le mentionnera explicitement (ex: "consulte .agents/feature/DONE-foo.md"). Pour une **vue complète** ("garde la vision complète", "ne rate rien"), charger en plus les living docs actives et le `doc/` courant.

## Découverte d'information — réflexes de recherche

Chercher avant de lire en entier (les `DONE-*` non compactés sont volumineux).

- Le `path` du Grep = **dossier**, jamais un fichier (l'outil élargit au parent). Pour cibler un fichier précis → filtre de fichiers de l'outil (`include` sous opencode, `glob` sous Claude Code) avec le nom (`"DONE-xxx.md"`).
- Pattern le plus **discriminant** d'abord : cibler la section (`^## Résumé métier`, `### SP-XXX`) plutôt qu'un mot-clé fréquent.
- Ordre de lecture d'une `DONE-*` : `## Résumé métier` (tête) → grep de section (fichier compacté : `## Registre des décisions`, `## Décisions & Justifications`, `## Leçons de réalisation`, `## Vigilances`, `## Dette connue`) → lecture à l'offset. Jamais full-read d'emblée.
- Version de travail d'un fichier compacté (contrat, revue, texte des questions) : `git show <hash>:<chemin>`, hash donné par la ligne de clôture de l'en-tête.
- Sortie tronquée / bruit ≥ ~20 matches → resserrer (filtre de fichiers + pattern), ne pas dépouiller.

## Subagents disponibles

Six subagents spécialisés sont définis dans `workflow-kit/core/agents/` :

| Agent | Fichier | Étapes | Permissions |
|---|---|---|---|
| `@specs` | `workflow-kit/core/agents/specs.md` | 0-1 (consulter specs + GWT baseline/évolution) | read, edit (.md only) |
| `@doc` | `workflow-kit/core/agents/doc.md` | Hors workflow (consultation ad hoc — questions clientes, audit rapide) | read, glob, grep (lecture seule) |
| `@test` | `workflow-kit/core/agents/test.md` | 2 (tests baseline/évolution, règle binaire unitaire/intégration) | read, edit, shell, glob, grep |
| `@architect` | `workflow-kit/core/agents/architect.md` | 3 (proposition architecture + challenge GWT/edge cases) | read, edit (.md only), glob, grep |
| `@dev` | `workflow-kit/core/agents/dev.md` | 4 (implémentation code minimal) + backtrack refacto | read, edit, bash, glob, grep |
| `@review` | `workflow-kit/core/agents/review.md` | 5 (revue qualité + plan de refacto optionnel) | read, bash, glob, grep + écrit sa section dans le feature `.md` (jamais Progression) |

**Invocation :** l'agent principal les invoque automatiquement via l'outil de délégation (`Task` / `Agent`) dans l'ordre du workflow. L'utilisateur peut aussi les invoquer manuellement avec `@nom` (ex: `@test lance les tests`).

**Périmètre :**
- `@specs` et `@architect` ne touchent qu'aux fichiers `.md` (prompt, pas de restriction technique)
- `@test` écrit les tests. Règle binaire unitaire/intégration : cf. `workflow-kit/core/agents/test.md`. Templates : `.agents/templates-index.md`.
- `@dev` implémente le code métier minimal, fait passer les tests au vert (étape 4). En backtrack refacto (post-review), applique le plan de `@review` sans changer le comportement.
- `@review` analyse sans modifier le code (read+grep+glob+bash) et écrit **uniquement** sa section `## Revue qualité (étape 5)` dans le feature file — jamais le tableau `## Progression` (Build), jamais de code/test/config. Produit un `### Plan de refacto` actionnable (optionnel) que l'utilisateur peut déclencher via "go refacto".

**Workflow complet** : voir `workflow-kit/core/agent-workflow.md`.

## ADR (Architecture Decision Records)

- Documenter chaque décision d'architecture dans le fichier `.agents/feature/<slug>.md` sous une section `## Décisions & Justifications (ADR)`
- Chaque ADR contient : le choix, les alternatives envisagées, la raison, la date
- Identifiant unique incrémental par feature : `ADR-1`, `ADR-2`, etc.
- Un ADR **métier** durable (règle de flux/calcul validée, hors spec) est destiné à devenir une entrée `SP-*` à la recette de l'étape 6 (cf. § Spec parallèle) — les ADR purement techniques restent dans le feature file.
