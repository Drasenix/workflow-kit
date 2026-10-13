# Feature Workflow (checkpoints obligatoires)

> **Interface de fichiers** : les noms de fichiers de `.agents/` sont l'interface stable du core (rôles génériques) ; chaque projet les remplit selon sa propre approche. Aucun mécanisme de slot.

Chaque feature suit **exactement** cette séquence, dans l'ordre, sans saut d'étape.
Quand une pause est obligatoire, et le régime des auto-gates (2, 4) : § « Pauses & anti-chaînage ».

## Étapes

| # | Étape | Agent | Livrable | Pause |
|---|---|---|---|---|
| 0 | **Consulter les specs** | `@specs` | Index du spec parallèle (`SP-*`) + sections ciblées du fichier de specs (`.agents/specs/spec.txt`) lues, résumé avec extraits + questions sourcées (`## Questions specs`) présentés à l'utilisateur | **OUI** |
| 1 | **Given/When/Then** | `@specs` | Scénarios baseline + évolution + edge cases sourcés (`## Edge cases identifiés`) dans `.agents/feature/<slug>.md` | **OUI** |
| 2 | **Test ROUGE** | `@test` | Tests qui échouent (baseline + évolution), **fichier unique** `<Feature>Test.*` (sans identifiant de lot) | **Auto (jalon 2→3)** |
| 3 | **Architecture** | `@architect` | Arbre indenté (prompt) + patterns + questions + **challenge GWT/edge cases** | **OUI** |
| 4 | **Développement VERT** | `@dev` | Code minimal qui fait passer les tests | **Auto (jalon 4→5)** |
| 5 | **Revue qualité** | `@review` | Checklist code mort/duplication/réutilisation + plan de refacto optionnel | **OUI** |
| 6 | **Résumé métier + recette nuances** | Build | Résumé non technique dans `.agents/feature/<slug>.md` sous `## Résumé métier` **+** `## Nuances consignées` (entrées `SP-*` créées/superseded) → écriture dans `.agents/specs/spec-parallele.md` après validation | **OUI** |
| 7 | **Passage DONE (mécanique)** | Build | Renommage `.agents/feature/<slug>.md` → `DONE-<slug>.md` + ligne 7 → OK dans le tableau Progression | **Auto (jalon 6→7)** |
| X | **Backtrack** | Build | Sur demande utilisateur, reprise à l'étape indiquée | |

> **Après le commit de livraison (hors étapes)** : le Build propose la compaction du fichier clos (skill `compacter-feature`) : garde l'apprentissage, retire le pilotage. Garde-fous : `workflow-kit/core/agent-build.md` § Gestion des features.

### Refacto via backtrack 4→5

Le refacto n'est **pas une étape distincte** : c'est un retour aux étapes 4 puis 5 avec un périmètre restreint.

```
Étape 5 → @review produit un rapport
    ├── Plan de refacto VIDE → Build demande "go global test ?"
    └── Plan de refacto NON VIDE → Build présente le plan à l'utilisateur
            ├── Utilisateur : "go refacto"
            │     → Backtrack étape 4 : @dev applique le plan (tests --filter= restent verts)
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

### Test global (régression)

Le run global (sans filtre) est la **responsabilité exclusive du Build** (agent principal) : **aucun subagent ne le lance**. Le Build l'exécute via `commande de test global (cf. .agents/workflow-commands.md)`, **une seule fois**. Jamais de global pendant l'itération dev (réservé à la fin de workflow, après l'étape 5). Commandes et calibrage : charger `.agents/skills/tests/SKILL.md`.

**Déclencheur unique :** `@review` termine l'étape 5 avec OK **et** un `### Plan de refacto` **vide**. Le Build présente alors un prompt explicite à l'utilisateur :

> *"Toutes les étapes sont OK, le code a été revu sans problème restant. Lancer le test global ?"*

L'utilisateur donne son **"go"**. Le Build exécute alors le global.

- [ ] **Check obligatoire AVANT de lancer le global** : `## Progression` entièrement OK (lignes 0 à 5), sinon **STRICTEMENT INTERDIT**. Le Build lit le tableau avant toute commande de test :
  ```
  Build vérifie .agents/feature/<slug>.md → tableau ## Progression
  ├── Toutes les lignes 0 à 5 sont OK → le global est autorisé
  └── Au moins une ligne est vide ou en cours → STRICTEMENT INTERDIT
  ```
- [ ] **Diagnostic** : vert → fin. Rouge → le Build diagnostique (classes en erreur, messages) et fait une **pause utilisateur**
- [ ] **Décision utilisateur** : retour étape 4 / investigation manuelle / ignorer
- [ ] **Max 2 globaux** par feature (1 initial, 1 de re-vérification après correction) : le second uniquement si le premier échoue et que l'utilisateur corrige

### Résumé métier + recette nuances (étape 6, responsabilité du Build)

**Déclencheur unique :** le test global est vert. Le Build produit le résumé métier (destiné à un public non technique) et l'ajoute dans `.agents/feature/<slug>.md` sous `## Résumé métier`.

**Check obligatoire AVANT d'écrire le résumé :**
```
Build vérifie .agents/feature/<slug>.md → tableau ## Progression
├── Toutes les lignes 0 à 5 sont OK → le résumé est autorisé
├── Le plan de refacto de l'étape 5 est vide → le résumé est autorisé
└── Une ligne est vide ou le plan non vide → le résumé est STRICTEMENT INTERDIT
```

#### Structure obligatoire

- **Ce qui s'est passé** : une ou deux phrases sur le problème constaté, en termes métier. Jamais de jargon technique.
- **Ce qu'on a mis en place** (liste numérotée) : chaque point décrit la situation **avant/après** sans jargon. Verbes d'action : « on rembourse », « on bloque », « on surveille », « on alerte ».
- **Est-ce que ça casse quelque chose ?** : une phrase rassurante (ou plusieurs si nécessaire) sur les flux existants non impactés.

#### Règles

- **Sans jargon** : proscrire les termes techniques internes (noms de patterns, jobs, transactions, locks, webhooks, DTO, listeners…). Traduire en langage métier.
- **Concis** : 10-15 lignes max.
- **Pas de code, pas de nom de fichier**.

**Recette nuances (obligatoire, dans la même pause que le résumé).** Le Build relit la feature (Décisions, arbitrages, ADR, réponses aux questions, plan de refacto) et identifie les **règles métier validées, durables et hors spec officiel** (critères : `workflow-kit/core/agent-build.md#Spec parallèle (garde-fou)`). Il propose les entrées `SP-*` (ID, type `AMENDE`/`PRECISE`/`ETEND`, ancre officielle, règle, supersession éventuelle) dans `## Nuances consignées` de `.agents/feature/<slug>.md`, et les présente **en même temps** que le résumé métier.

- Si la feature n'introduit ni n'amende aucune règle métier : `## Nuances consignées` porte `Aucune` (pas de pause supplémentaire).
- **Pause utilisateur (fusionnée) :** le Build présente résumé **+** nuances. L'utilisateur valide, ajuste la formulation, ou refuse une entrée.
- **Le « go » de validation vaut droit d'écriture** pour le spec parallèle (garde-fou identique à `.agents/reference-utilitaires.md`).
- **Revue de péremption (obligatoire)** : pour les `SP-*` du périmètre touché par la feature, vérifier qu'ils sont toujours vrais au regard du code livré. Si une règle a changé, proposer à l'utilisateur une **supersession** (ancienne entrée marquée caduque + nouvelle entrée) dans la même recette.
- **Contrôle d'intégrité** : après écriture, exécuter les 4 vérifications de la section « Contrôle d'intégrité » de `.agents/specs/spec-parallele.md`.
- Après validation : le Build écrit les `SP-*` dans `.agents/specs/spec-parallele.md` (index + entrées + marquage des entrées remplacées), puis met à jour le tableau `## Progression` (6 → OK). La feature est considérée comme livrée.

## Dimensionnement de feature (S / Standard)

Défini à la création de la feature, **validé par l'utilisateur** (jamais posé par la machine seule, cf. `workflow-kit/core/agent-build.md`, Gestion des features). Défaut : **Standard**. En cas de doute → Standard.

### Critères S (tous requis, sinon Standard)

| Critère | Seuil S |
|---|---|
| Nouveaux fichiers | ≤ 2 |
| Fichiers existants modifiés | ≤ 1 |
| Migration | 0 |
| Nouvel endpoint / route | 0 |
| Total scénarios GWT (baseline + évolution) | ≤ 4 |

### Effets du mode S (et uniquement ça)

| Élément | Standard | S |
|---|---|---|
| Pauses 0 + 1 | Séparées | **Fusionnées** : résumé specs + GWT présentés ensemble, une seule validation |
| Étape 3 | Livrable complet (patterns, ADR) | **Mode mini** : `@architect` toujours invoqué, livrable réduit = contrat d'implémentation + fichiers à créer. Pas d'ADR obligatoire, questions seulement si bloquant |
| Étapes 2, 4, 5, 6 | | **Identiques** |
| Test global, backtrack | | **Identiques** |

**Règle :** le mode S allège la présentation, jamais le contrôle qualité. Les étapes 2, 4, 5, le test global et le backtrack restent obligatoires.

## Orchestration par subagents

Chaque étape est déléguée à un subagent spécifique (`workflow-kit/core/agents/`) :

- **`@specs`** : étapes 0-1 : lecture du fichier de specs (`.agents/specs/spec.txt`) + glossaire + questions specs sourcées + rédaction GWT baseline/évolution + edge cases sourcés
- **`@test`** : étape 2 : traduction GWT → tests dans un **fichier unique** (`<Feature>Test.*`, nom de feature **sans identifiant de lot** ; méthodes d'après le comportement **sans identifiant de scénario** `B1`/`E1`), vérification baseline vert / évolution rouge
- **`@architect`** : étape 3 : proposition d'architecture avec arbre indenté (prompt) + **challenge critique indépendant** des GWT/edge cases
- **`@dev`** : étape 4 : code minimal qui fait passer les tests au vert
- **`@review`** : étape 5 : revue qualité post-implémentation, produit un `### Plan de refacto` actionnable (optionnel)
- **`@doc`** : **hors workflow** : consultation des specs (questions clientes, audit rapide), réponse sourcée en **deux blocs** (spec officielle / ajouts `SP-*`), lecture seule

L'agent principal (Build) :
1. Consulte `.agents/templates-index.md` pour choisir les templates adaptés
2. Crée `.agents/feature/<slug>.md` au début de la feature à partir de `workflow-kit/core/templates/feature.md`
3. **Met à jour le tableau `## Progression`** : bascule l'étape en cours
4. Invoque chaque subagent dans l'ordre via l'outil de délégation (`Task` sous opencode, `Agent` sous Claude Code)
5. **Après chaque étape** : met à jour le tableau `## Progression` dans `.agents/feature/<slug>.md`
   - Succès → `OK YYYY-MM-DD`
   - Étape déjà couverte / sautée → `sauté`
6. **Fait une pause après les étapes à décision sémantique (0, 1, 3, 5, 6)** ; auto-gates 2/4 selon le jalon : § « Pauses & anti-chaînage »
7. Relit le `.md` produit par le subagent avant de passer au suivant
8. Ne passe pas à l'étape N+1 sans validation utilisateur
9. **Ne lance le test global que quand le tableau `## Progression` est entièrement OK** ET que l'étape 5 a un plan de refacto vide ET que l'utilisateur a donné son go explicite : voir « Test global ».

**Dépendances entre subagents :**
- `@specs` lit l'**index du spec parallèle** (`.agents/specs/spec-parallele.md`) puis le fichier de specs (`.agents/specs/spec.txt`) + glossaire (étape 0), puis rédige les GWT (étape 1)
- `@test` lit les GWT produits par `@specs` et écrit les tests
- `@architect` lit le GWT produit par `@specs` (et les entrées `SP-*` citées, si applicable)
- `@dev` lit l'architecture produite par `@architect` et les tests écrits par `@test`
- `@review` lit le code produit par `@dev` et le GWT dans le `.md`
- Les subagents ne s'invoquent pas entre eux : seul l'agent principal orchestre

## Règles dures

- Si une étape révèle une incohérence métier, **revenir à l'étape 0 ou 1** : pas de correctif en cours de route.
- Le GWT dans `.agents/feature/<slug>.md` est la **source de vérité** du contrat. Le test en est une traduction 1:1.
- Si `@review` (étape 5) détecte un problème, l'utilisateur peut demander un retour à l'étape 4 (ou autre).
- Si `@review` (étape 5) produit un plan de refacto non vide → backtrack 4→5 (cf. « Refacto via backtrack 4→5 »).
- Exécution des tests (TDD, fichier unique, global) : cf. `workflow-kit/core/agent-build.md` § « TDD » + § « Tests ».
- **Primauté du spec parallèle** : cf. `workflow-kit/core/agent-build.md` § « Spec parallèle (garde-fou) » + § « Jalon 1→2 » ci-dessous.
- **Aucune règle métier durable ne passe DONE sans être consignée** : cf. `workflow-kit/core/agent-build.md` § « Spec parallèle (garde-fou) » + § « Jalon 6→7 » ci-dessous.

## Pauses & anti-chaînage

### Quand s'arrêter

- **Étapes à décision sémantique (0, 1, 3, 5, 6)** : pause obligatoire : le livrable est présenté, puis l'agent attend un go explicite ("go", "ok", "oui", "continue") avant l'étape suivante.
- **Étapes mécaniques (2 et 4), auto-gates** : enchaînement automatique **si** le jalon Build correspondant est OK (jalons 2→3 et 4→5, § « Checklist Build »).
- **Toute anomalie détectée par un jalon → pause utilisateur immédiate** (baseline rouge, évolution verte avant implémentation, tests rouges après dev, contrat dévié).

### Règle ABSOLUE : anti-chaînage

**Ne JAMAIS enchaîner deux étapes à décision sémantique dans le même tour.** Les seuls enchaînements autorisés sont les auto-gates (2→3 et 4→5) quand le jalon correspondant est OK.

- Une étape = un subagent invoqué via l'outil de délégation (`Task` / `Agent`)
- Les étapes à décision sémantique (0, 1, 3, 5, 6) exigent le "go" explicite de l'utilisateur avant la suivante
- Auto-gates : après @test (étape 2), le Build peut enchaîner sur @architect (étape 3) **uniquement si le jalon 2→3 est OK**. Après @dev (étape 4), le Build peut enchaîner sur @review (étape 5) **uniquement si le jalon 4→5 est OK**
- Si le jalon détecte une anomalie → **STOP**, pause utilisateur
- Même si le livrable semble parfait, ne pas franchir une pause sémantique sans go

**Exemples interdits :**
- L'agent @specs termine l'étape 1 → enchaîner directement sur @test étape 2 (pause sémantique)
- L'agent @test termine l'étape 2 avec un jalon 2→3 en échec (ex : baseline rouge) → enchaîner sur @architect (pause obligatoire)
- Proposer du code correctif dans le même message que la revue

**Sanction :** si l'utilisateur reprend un enchaînement non autorisé, revenir immédiatement à l'étape précédente, annuler toute action non demandée, et attendre le go.

### Comportement pendant la pause

- L'agent présente le livrable de l'étape et s'arrête
- Il ne passe pas à l'étape suivante tant qu'il n'a pas reçu une réponse (validation, rejet, ou question)
- L'utilisateur peut demander un retour à une étape antérieure : "retour étape 3"
- Si l'utilisateur dit **"stop"** ou **"pause"** → l'agent interrompt immédiatement toute action en cours.

### Règle ABSOLUE : incohérence de Progression → pause

Le tableau `## Progression` sert de diagnostic rapide. Avant de passer à l'étape N+1, le vérifier :

- Si une étape est OK sans que l'étape précédente soit OK ou sautée → **pause utilisateur**
- Si une étape a été sautée sans justification dans le fichier → **pause utilisateur**
- Si l'étape 2, 3, 4, ou 5 est cochée alors que l'étape 0 ou 1 est vide → **pause utilisateur**
- Si un test baseline est rouge après implémentation → **pause utilisateur** (régression)
- Si un test évolution est vert avant implémentation → **pause utilisateur** (code déjà existant ou test mal écrit)

**Comportement attendu :** dans chaque cas, EXPLIQUER l'incohérence à l'utilisateur, NE PAS continuer l'étape suivante sans réponse explicite. Le mot "continue", "go", "ok" ou "oui" doit apparaître dans sa réponse.

## Checklist Build : validation entre étapes

Avant de passer de l'étape N à N+1, l'agent Build vérifie systématiquement les points communs ci-dessous **plus** les points spécifiques au jalon concerné.

### Points communs (toutes les transitions)

- [ ] Le livrable du subagent est présent dans `.agents/feature/<slug>.md`
- [ ] Les sections obligatoires du template sont remplies (pas de squelette vide, pas de `<!-- -->`)
- [ ] Aucun marqueur `[À VALIDER]` non résolu ne subsiste
- [ ] La section `## Ambiguïtés à valider` est vide : si elle ne l'est pas → **pause utilisateur**
- [ ] Si un point échoue → **ne pas passer à l'étape suivante**, demander clarification ou correction au subagent

### Jalon 1→2 (GWT → tests)

- [ ] Le tag de taille (`S` / `Standard`) est validé par l'utilisateur
- [ ] Chaque scénario baseline a exactement **un seul WHEN**
- [ ] Chaque scénario baseline a **au moins un THEN**
- [ ] Chaque scénario évolution a exactement **un seul WHEN**
- [ ] Chaque scénario évolution a **au moins un THEN**
- [ ] Les termes métier utilisés dans les GWT figurent dans `.agents/domain-glossary.md` (ou sont explicitement validés)
- [ ] Aucun GWT ne contredit un `SP-*` en vigueur (`.agents/specs/spec-parallele.md`) : sinon la feature doit l'amender explicitement (`[AMENDE SP-XXX]` dans `## Ambiguïtés à valider`, tranché par l'utilisateur à la pause 1)
- [ ] La section `## Questions specs (étape 0)` porte des questions **sourcées** (source + trou) **ou** `Aucune`
- [ ] Chaque question a été résolue par le PO ou marquée `[AMENDE SP-XXX]`
- [ ] La section `## Edge cases identifiés` porte des edge cases **sourcés** (règle source) **ou** `Aucun`
- [ ] Chaque edge case a un GWT associé OU est marqué `non couvert` avec justification
- [ ] Aucun edge case `couvert` n'est sans test correspondant
- [ ] Si un scénario est ambigu ou incomplet → **pause utilisateur**, ne pas envoyer à @test

### Jalon 2→3 (tests → architecture), auto-gate

- [ ] Les tests baseline sont verts : commande `commande de test ciblé (cf. .agents/workflow-commands.md)`
- [ ] Les tests évolution sont rouges : commande `commande de test ciblé (cf. .agents/workflow-commands.md)`
- [ ] Baseline et évolution vivent dans un **fichier unique** `<Feature>Test.*` (jamais deux fichiers séparés), nommé d'après la **feature** — sans identifiant de lot (`F0`/`F1`…)
- [ ] Aucun nom de méthode de test ne contient d'identifiant de scénario (`B1`, `E1`…) : les méthodes décrivent le comportement
- [ ] Le output est inclus dans le rapport de `@test`

**Issue :** tout OK → enchaîner automatiquement sur @architect (sans pause). Un seul échec → **pause utilisateur**, ne pas invoquer @architect.

### Pause 3 (architecture → dev), décision sémantique

- [ ] La section `### Challenge GWT / edge cases` de `.agents/feature/<slug>.md` est remplie : constats **justifiés** (GWT/EC visé + règle source + trou), ou `Aucun`
- [ ] Tout écart réel (GWT non implémentable, edge case manquant, contradiction `SP-*`) est **tranché par l'utilisateur** (retour étape 1, ou acceptation tracée)
- [ ] Aucun écart non tranché : sinon **pause**, ne pas invoquer `@dev`

### Jalon 4→5 (code → review), auto-gate

- [ ] Tous les tests (baseline + évolution) sont verts : commande `commande de test ciblé (cf. .agents/workflow-commands.md)`
- [ ] Le rapport de @dev inclut le output du run ciblé
- [ ] La section `### Contrat d'implémentation` dans `.agents/feature/<slug>.md` est remplie et les signatures correspondent au code produit
- [ ] @review a produit la section `### 8. Edge cases métier` (tableau **ou** `Aucun`)
- [ ] Aucun écart non justifié entre le code et les edge cases

**Issue :** tout OK → enchaîner automatiquement sur @review (sans pause). Un seul échec → **pause utilisateur**, ne pas invoquer @review.

### Jalon 6→7 (nuances → DONE), auto-gate

- [ ] La section `## Nuances consignées` du `.agents/feature/<slug>.md` est remplie : liste des `SP-*` créés/superseded **ou** `Aucune`
- [ ] La section `## Conventions (fichiers-rôles)` du `.agents/feature/<slug>.md` est traitée : fichiers-rôles impactés **à jour** (ou `Aucune`) ; **aucune référence morte**
- [ ] Les entrées validées par l'utilisateur sont écrites dans `.agents/specs/spec-parallele.md` (index + entrées ; marquage caduc posé sur les entrées remplacées)
- [ ] Les entrées et reports d'un **lot antérieur** que cette feature rend **faux** (backlog, fichiers-rôles, `.agents/reference-utilitaires.md`) sont corrigés, ou signalés à l'utilisateur

**Issue :** tout OK → passage DONE (renommage). Un seul échec → **pause utilisateur** (l'écriture du spec parallèle est de la responsabilité du Build et conditionne le passage DONE).

## Protocole de backtrack (étape X)

Quand l'utilisateur dit "retour étape N" (ou équivalent) :

1. L'agent principal demande confirmation : "Reprendre à l'étape N : les étapes suivantes seront ré-exécutées. Confirmer ?"
2. Sur confirmation, l'étape N est ré-exécutée avec le subagent correspondant
3. Les étapes ultérieures sont refaites dans l'ordre (N+1, N+2…)
4. Chaque étape refaite respecte le protocole de pause

**Backtrack limité** : si les étapes suivantes supposent déjà le résultat de l'étape reprise (ex. renforcer une assertion que l'architecture présume déjà), le Build peut proposer de ne refaire **que** cette étape. Il le dit explicitement dans la demande de confirmation, l'utilisateur confirme, et la décision est tracée par un ADR.

## Format de présentation (prompt)

### Communication prompt (pauses, résumés)
Utiliser l'**arbre indenté textuel** (lisible en CLI) :
```
Route GET /<ressource>/<id>/<action>
  └─> <Controller>
       ├─> <Service>
       │    ├─> <Model>::query() (vérification)
       │    └─> <Utilitaire>::<methode>() (existant)
       └─> <DTO>
```
