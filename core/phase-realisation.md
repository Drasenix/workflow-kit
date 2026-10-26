# Phase réalisation (étapes 2-7)

> Règles propres aux étapes 2 à 7 : tests, plan, développement, revue, test global, résumé métier, passage DONE, compaction. Chargées par la skill `realiser` (`/realiser [feature]`), dans une session neuve dont l'agent principal est le Build.
> Règles communes aux deux phases (séquence, pauses, Registre, backtrack, fichiers meta) : `workflow-kit/core/agent-workflow.md` et `workflow-kit/core/agent-build.md`. Qui lit quoi : `workflow-kit/core/index.md`.

## TDD

Les tests sont écrits par `@test` à l'étape 2, l'implémentation par `@dev` à l'étape 4. La frontière TDD est garantie par le workflow : le code n'est écrit qu'après avoir vu les tests 🔴. Runs ciblés des subagents sans parallélisme ; run global réservé au Build (cf. § « Test global »). Commandes et calibrage : `.agents/skills/tests/SKILL.md`.

## Formatage du code

Commande de formatage (cf. `.agents/workflow-commands.md`) uniquement sur les fichiers modifiés, jamais sur l'ensemble du projet.

## Jalons et pauses de la réalisation

Points communs à toutes les transitions : `workflow-kit/core/agent-workflow.md` § « Points communs ».

### Jalon 2→3 (tests → plan), auto-gate

- [ ] Tests baseline verts et tests évolution rouges (run ciblé, résultat inclus dans le rapport de `@test`)
- [ ] Baseline et évolution dans un **fichier unique** `<Feature>Test.*` nommé d'après la **feature** — sans identifiant de lot
- [ ] Aucun nom de méthode de test ne contient d'identifiant de scénario (`B1`, `E1`…)
- [ ] Aucun edge case `couvert` sans test correspondant

**Issue :** tout OK → enchaîner automatiquement sur `@dev` pour le **plan** (sans pause). Un seul échec → **pause utilisateur**, ne pas invoquer `@dev`.

### Pause 3 (plan → code), décision sémantique

Le Build présente le plan (arbre de flux en tête) et s'arrête.

- [ ] `## Plan (étape 3)` rempli : arbre de flux, fichiers, code réutilisé, signatures publiques (`Aucun` admis là où il n'y a rien)
- [ ] Choix structurants et questions **tranchés par l'utilisateur** ; chaque choix validé → ADR écrit par le Build (§ « ADR »)
- [ ] Références mortes et fichiers-rôles signalés par `@dev` inscrits dans `## Conventions (fichiers-rôles)`
- [ ] Les puces de `### Nouveaux utilitaires à référencer` restent ouvertes : elles sont tranchées à la pause 5 (§ « Pause 5 »)

**Après le go** : le Build fait passer `@dev` à l'étape 4 — en **reprenant** le même sous-agent quand l'outil le permet (il garde le contexte du plan), sinon en le **réinvoquant** avec `## Registre des décisions`, `## Plan (étape 3)` et `## Décisions & Justifications`.

### Écart majeur pendant le code

`@dev` s'arrête sur un écart majeur au plan (fichier ou couche non prévu, signature publique modifiée, fichier hors du plan, réutilisation abandonnée, utilitaire contourné) : **pause utilisateur**. Le Build présente l'écart et sa contrainte ; la décision passe au Registre (et en ADR si elle change un choix structurant), puis `@dev` reprend.

Un **trou métier** (comportement que les GWT ne spécifient pas) se règle au raffinement : `workflow-kit/core/phase-raffinement.md` § « Rappel depuis la réalisation ». Une simple formulation (THEN imprécis, référence fausse) se corrige sur place.

### Jalon 4→5 (code → review), auto-gate

- [ ] Tous les tests (baseline + évolution) verts : run ciblé inclus dans le rapport de @dev
- [ ] `### Écarts au plan` rempli (`Aucun` ou écarts mineurs déclarés) ; aucun écart majeur sans décision au Registre

**Issue :** tout OK → enchaîner automatiquement sur @review (sans pause). Un seul échec → **pause utilisateur**, ne pas invoquer @review.

### Pause 5 (revue → global)

- [ ] @review a produit la section `### Edge cases métier` (tableau **ou** `Aucun`) et aucun écart non justifié
- [ ] **Récapitulatif technique** : le Build présente `### Décisions techniques` (utilitaires à référencer de toutes les étapes, fichiers-rôles, références mortes), chaque ligne avec la décision proposée par `@review`. L'utilisateur conteste les lignes qu'il veut ; **le reste est accepté**. Une seule ligne au Registre (« récapitulatif technique accepté, sauf T… »), puis le Build répercute chaque décision sur sa trace (`workflow-kit/core/agent-workflow.md` § « Le Registre d'abord »)
- [ ] Questions **métier** de la revue (`[À CONSIGNER]`, `[AMENDE SP-*]`) arbitrées une à une

### Jalon 6→7 (nuances → DONE), auto-gate

Le Build lance le **contrôle de livraison** (mécanique, il ne se coche pas de mémoire) : skill `controle-livraison` (`workflow-kit/core/skills/controle-livraison/SKILL.md`), qui exécute :

```
node workflow-kit/bin/workflow-kit.mjs check .agents/feature/<chemin>/<slug>.md
```

Ce qu'il vérifie et la procédure en cas de `[KO]` : dans la skill — dont, pour un fichier au gabarit à deux phases, le plan (arbre de flux, fichiers), les écarts au plan et les décisions techniques remplis.

Le Build vérifie en plus (jugement, non mécanisable) :
- [ ] Les entrées et reports d'un **lot antérieur** que cette feature rend **faux** (backlog, fichiers-rôles, `.agents/reference-utilitaires.md`) sont corrigés, ou signalés à l'utilisateur
- [ ] Le Registre porte une ligne par décision, colonne « Consigné dans » complétée

**Issue :** contrôle `[ok]` et points cochés → passage DONE (renommage). Sinon → **pause utilisateur** et procédure de la skill. Le Build relance le contrôle **avant de proposer le commit** de livraison (le fichier a pu bouger depuis le jalon).

**Chevauchement en cours** (une autre feature est en étapes 0-1 dans une autre session, cf. `workflow-kit/core/phase-raffinement.md` § « Chevauchement de features ») : la feature en réalisation est prioritaire, et son commit de livraison n'embarque pas le `.md` de l'autre feature.

## Refacto via backtrack 4→5

Le refacto n'est **pas une étape distincte** : c'est un retour aux étapes 4 puis 5 avec un périmètre restreint.

```
Étape 5 → @review produit un rapport
    ├── Plan de refacto VIDE → Build demande "go global test ?"
    └── Plan de refacto NON VIDE → Build présente le plan à l'utilisateur
            ├── Utilisateur : "go refacto"
            │     → Registre : ligne « go refacto » AVANT d'invoquer @dev
            │     → Backtrack étape 4 : @dev applique le plan (tests ciblés restent verts)
            │     → Backtrack étape 5 : @review re-vérifie le code modifié
            │           ├── Plan vide → Build demande "go global test ?"
            │           │     → Global OK → Build produit le résumé métier (étape 6)
            │           │     → Pause utilisateur (validation du résumé)
            │           └── Plan non vide → nouvelle itération (re-demander à l'utilisateur)
            └── Utilisateur : "skip refacto" → Build demande "go global test ?"
                  → Global OK → Build produit le résumé métier (étape 6)
                  → Pause utilisateur (validation du résumé)
```

**Règles :**
- Chaque passage de `@dev` en backtrack est suivi d'un passage de `@review` : **tout code modifié est revu**
- Le OK final de l'étape 5 signifie "code propre, rien à redire, plan de refacto vide"
- `@dev` en backtrack applique **uniquement** les lignes du plan, sans improviser
- `@review` en backtrack ne vérifie que les fichiers touchés par le plan
- Un utilitaire créé pendant le refacto (puce de `@dev` dans `### Nouveaux utilitaires à référencer`) est soumis à l'utilisateur à la pause qui suit la re-revue

## Test global (régression)

Le run global (sans filtre) est la **responsabilité exclusive du Build** : **aucun subagent ne le lance**. Le Build l'exécute via la commande de test global (cf. `.agents/workflow-commands.md`), **une seule fois**. Jamais de global pendant l'itération dev (réservé à la fin de workflow, après l'étape 5). Commandes et calibrage : charger `.agents/skills/tests/SKILL.md`.

**Déclencheur unique :** `@review` termine l'étape 5 avec OK **et** un `### Plan de refacto` **vide**. Le Build présente alors un prompt explicite à l'utilisateur :

> *"Toutes les étapes sont OK, le code a été revu sans problème restant. Lancer le test global ?"*

L'utilisateur donne son **"go"**. Le Build exécute alors le global.

- [ ] **Check obligatoire AVANT de lancer le global** : `## Progression` entièrement OK (lignes 0 à 5), sinon **STRICTEMENT INTERDIT**.
- [ ] **Diagnostic** : vert → fin. Rouge → le Build diagnostique (classes en erreur, messages) et fait une **pause utilisateur**
- [ ] **Décision utilisateur** : retour étape 4 / investigation manuelle / ignorer
- [ ] **Max 2 globaux** par feature (1 initial, 1 de re-vérification après correction) : le second uniquement si le premier échoue et que l'utilisateur corrige

## Résumé métier + recette nuances (étape 6, responsabilité du Build)

**Déclencheur unique :** le test global est vert. **Check préalable** : lignes 0 à 5 de `## Progression` OK et plan de refacto de l'étape 5 vide — sinon le résumé est **STRICTEMENT INTERDIT**.

### Structure obligatoire du résumé (`## Résumé métier`)

- **Ce qui s'est passé** : une ou deux phrases sur le problème constaté, en termes métier.
- **Ce qu'on a mis en place** (liste numérotée) : chaque point décrit la situation **avant/après**. Verbes d'action : « on rembourse », « on bloque », « on surveille », « on alerte ».
- **Est-ce que ça casse quelque chose ?** : une phrase rassurante (ou plusieurs) sur les flux existants non impactés.

Sans jargon (ni pattern, job, transaction, lock, webhook, DTO, listener…), sans code ni nom de fichier, 10-15 lignes max.

### Recette nuances (dans la même pause que le résumé)

Le Build relit `## Registre des décisions`, les ADR et les puces `[À CONSIGNER]` / `[AMENDE SP-*]`, et identifie les **règles métier validées, durables et hors spec officiel** (critères : `workflow-kit/core/agent-build.md` § Spec parallèle). Il propose les entrées `SP-*` (ID, type `AMENDE`/`PRECISE`/`ETEND`, ancre officielle, règle, supersession éventuelle) dans `## Nuances consignées`, et les présente **en même temps** que le résumé.

- Aucune règle introduite ni amendée : `## Nuances consignées` porte `Aucune`.
- **Pause fusionnée :** l'utilisateur valide, ajuste ou refuse. Le « go » vaut droit d'écriture du spec parallèle.
- **Revue de péremption (obligatoire)** : les `SP-*` du périmètre sont-ils toujours vrais au regard du code livré ? Sinon, proposer une **supersession** dans la même recette.
- Après validation : le Build écrit les `SP-*` (index + entrées + marquage des entrées remplacées), lance `node workflow-kit/bin/workflow-kit.mjs check-meta --spec` (« Contrôle d'intégrité » de `.agents/specs/spec-parallele.md`, mécanique) jusqu'à `[ok]`, résout chaque puce `[À CONSIGNER]` / `[AMENDE SP-*]` (`→ ✅ SP-XXX` ou `→ ⛔ <raison>`), puis passe la ligne 6 à OK.

## ADR (Architecture Decision Records)

- Chaque choix structurant du plan validé à la pause 3 (et chaque écart majeur qui en change un) est documenté par le Build dans `.agents/feature/<slug>.md` sous `## Décisions & Justifications — ADR (étape 3)`
- Chaque ADR contient : le choix, les alternatives envisagées, la raison, la date ; identifiant incrémental par feature (`ADR-1`, `ADR-2`…)
- Un ADR **métier** durable (règle de flux/calcul validée, hors spec) devient une entrée `SP-*` à la recette de l'étape 6 ; les ADR purement techniques restent dans `.agents/feature/<slug>.md`.

## Détection de nouveaux templates

Pendant les étapes 3-4, si un pattern de code standardisé apparaît pour la **2ème fois** (même structure, seuls les noms changent), le signaler en pause :

> *« Ce pattern revient pour la 2ème fois. Créer un template `workflow-kit/core/templates/...` ? »*

- Concerne les structures répétitives propres à la stack (contrôleur, job, mail, notification, rule, scope, cast…)
- Un template existant pas assez générique → proposer une généralisation
- **Jamais de création ni de modification de template sans accord explicite** ; `.agents/templates-index.md` mis à jour en même temps

## Event-Driven : migration

Quand on adopte un pattern event-driven dans un module :
- Vérifier les **appels directs existants** (création, résolution, suppression) dans les services/actions qui devraient passer par des events
- Les remplacer par un dispatch d'event depuis le point d'entrée métier
- **Ne pas laisser de doublon** (appel direct + event) : l'un des deux doit disparaître
- Si un service métier manipule directement des tâches système, c'est un signe qu'il faut migrer vers un event

## Format de présentation (prompt)

Utiliser l'**arbre indenté textuel** (lisible en CLI) :
```
Route GET /<ressource>/<id>/<action>
  └─> <Controller>
       ├─> <Service>
       │    ├─> <Model>::query() (vérification)
       │    └─> <Utilitaire>::<methode>() (existant)
       └─> <DTO>
```

## Compaction post-livraison

Une fois le fichier clos (`DONE-*`, `ABANDON-*`, `IRREPRODUCTIBLE-*`) committé, **proposer** sa compaction (skill `compacter-feature`, squelette `workflow-kit/core/templates/feature-cloturee.md`). Garde-fous :
- **jamais avant le commit de livraison** : le fichier doit être dans git en version complète et sans modification locale (sinon la version de travail est perdue) ;
- tout **identifiant interne cité ailleurs** (spec parallèle, backlog, autres features) reste présent dans le fichier compacté ;
- **rien de transversal** n'est supprimé sans être consigné ailleurs (sinon proposition de remontée, avec accord) ;
- pas de compaction si une **feature en cours** cite des sections destinées à être supprimées ;
- **nom du fichier inchangé** ;
- **validation du diff** par l'utilisateur, commit séparé **sur demande explicite** uniquement.
