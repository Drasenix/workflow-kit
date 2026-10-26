# Phase raffinement (étapes 0-1)

> Règles propres aux étapes 0 et 1 : création de la feature, compréhension, rédaction des GWT, challenge, gel (jalon 1→2). Chargées par la skill `raffiner` (`/raffiner [feature]`), ou au démarrage d'une session lancée sur l'agent `raffineur`.
> Règles communes aux deux phases (séquence, pauses, Registre, backtrack, fichiers meta) : `workflow-kit/core/agent-workflow.md` et `workflow-kit/core/agent-build.md`. Qui lit quoi : `workflow-kit/core/index.md`.

La phase se déroule dans une **session dédiée**, dont l'agent principal est le **raffineur** (`workflow-kit/core/agents/raffineur.md`) : l'utilisateur lui parle directement. La session est lancée sur l'agent `raffineur` quand l'outil le permet (`claude --agent raffineur`, Tab sous opencode) ; sinon l'agent par défaut en endosse le rôle par la skill `raffiner` (`/raffiner [feature]`), qui fonctionne partout. Le raffineur ne lit ni les specs ni le code ; il délègue la lecture à trois sous-agents en lecture seule — `@doc` (specs, spec parallèle, glossaire), `@explorateur` (code et tests), `@challenger` (écarts entre les GWT et le code).

## Déroulé

```
Création de la feature
  └─ Étape 0 — Compréhension
       ├─ @doc (mode raffinement) ─┐ en parallèle
       ├─ @explorateur ────────────┘
       └─ ARRÊT 1 : synthèse (spec / code actuel / questions)
  └─ Étape 1 — Rédaction → Challenge → Gel
       ├─ GWT + edge cases rédigés avec l'utilisateur (nouvelles recherches à la demande)
       ├─ @challenger → écarts → arbitrés par l'utilisateur
       ├─ contrôle de livraison (format, questions, arbitrages)
       └─ ARRÊT 2 : Definition of Ready → jalon 1→2 → session de réalisation
```

Les deux arrêts sont les pauses des étapes 0 et 1 : entre eux, l'échange est une conversation, sans pause formelle. Chaque décision de l'utilisateur qui change le cours passe d'abord au Registre (`workflow-kit/core/agent-workflow.md` § « Le Registre d'abord »).

## Création d'une feature

- **Nouvelle feature** : quand l'utilisateur annonce "je commence [nom]", créer `.agents/feature/<slug>.md` à partir du template `workflow-kit/core/templates/feature.md`, remplacer les marqueurs (`<Nom>`, date), et considérer qu'on travaille sur cette feature
- **Feature issue d'un lot de chantier** : si la feature découle d'un lot d'un chantier PO (dossier contenant `.agents/feature/**/SPECS.md` / `BACKLOG.md` / `FICHE-REUNION.md`), lire le `BACKLOG` du chantier (ligne du lot) et le `SPECS` aux sections citées, reporter le lot dans l'en-tête de la feature (ligne `> Lot : …`), et transmettre ce **périmètre** (lot + sections + entrées `SP-*`) à `@doc` et `@explorateur`. Le fichier de feature suit la convention de chemin du projet (racine `.agents/feature/` **ou** sous-dossier du chantier)

## Étape 0 — Compréhension

1. Invoquer **en parallèle** `@doc` en **mode raffinement** (périmètre + questions) et `@explorateur` (périmètre + questions). Le `@doc` de la commande `/doc` reste disponible pour les questions ad hoc de l'utilisateur.
2. Reporter dans le fichier de feature :
   - `## Specs consultées (étape 0)` : les **références** rendues par `@doc` (pages/sections, `SP-*` avec statut, termes du glossaire), sans recopier leur contenu, et les **sources externes** consultées en ligne par le raffineur (URL, date, ce qu'elles établissent) ;
   - `## Contexte technique (étape 0)` : les faits de `@explorateur` utiles à la réalisation, avec leur `fichier:ligne` — point d'entrée, tests existants touchés, contraintes techniques. Le comportement actuel sert aux baselines ; les zones d'ombre bloquantes deviennent des questions. `Aucun` si rien d'utile ;
   - `## Questions specs (étape 0)` : les **questions bloquantes** (ci-dessous).
3. **ARRÊT 1** : présenter la synthèse, puis attendre la réponse de l'utilisateur.

### Questions bloquantes

Une question n'est légitime que si elle empêche de rédiger un GWT non ambigu, c'est-à-dire **l'un** de ces cas (les « trous » signalés par `@doc`, les zones d'ombre bloquantes de `@explorateur`) :
- un cas décrit sans comportement attendu ;
- deux passages contradictoires, ou un terme absent du glossaire ;
- une règle dépendant d'un état non couvert par la spec ;
- un `SP-*` en vigueur qui contredit implicitement le besoin ;
- un comportement actuel du code qui contredit la spec ou le besoin ;
- une source externe (réglementation, norme, service tiers) qui contredit ou complète la spec.

Chaque question **cite sa source** (page/section, terme de glossaire, `SP-*`, `fichier:ligne`, URL) **et le trou constaté** : `- [ ] <question> — source : <…> — trou : <…>`. `Aucune` est une réponse **valide et attendue** quand la spec et le code sont clairs.

### Format de la synthèse (arrêt 1)

Arbre indenté (lisible en CLI) :
- **Ce que dit la spec** : pages/sections et extraits clés (2-3 phrases par page) ;
- **Ce qu'ajoute le spec parallèle** : `SP-*` lus (ID + titre + statut), ou « aucun `SP-*` applicable » ;
- **Sources externes**, s'il y en a : URL et ce qu'elles établissent ;
- **Termes du glossaire** consultés ;
- **Ce que fait le code aujourd'hui** : point d'entrée, comportement actuel, tests existants, contraintes ;
- **Questions bloquantes**, ou `Aucune`.

## Étape 1 — Rédaction

Dans `.agents/feature/<slug>.md`, deux sections distinctes :

```
## Scénarios baseline — comportement actuel (étape 1)

### Scénario B1 — Description
GIVEN <contexte / état actuel>
WHEN  <action>
THEN  <assertion 1>
THEN  <assertion 2>

## Scénarios évolution — nouveau comportement (étape 1)

### Scénario E1 — Nominal
GIVEN <contexte>
WHEN  <action métier>() est appelé
THEN  <entité> passe à l'état <nouvel état>
THEN  <effet secondaire attendu>
```

### Règles GWT

- **Baseline** (B1, B2…) : figent le comportement **actuel** (même buggé) — contrat avant modification. Ils se rédigent à partir du comportement observé par `@explorateur`, jamais de mémoire.
- **Évolution** (E1, E2…) : décrivent le comportement **futur** attendu.
- Les libellés `B1`/`E1` sont des **repères du feature file uniquement** : ils ne se recopient pas dans les noms de tests.
- Un scénario = **un seul WHEN** ; plusieurs THEN possibles.
- Descriptions en français.
- Couvrir au moins : le nominal, les cas d'erreur (accès refusé, introuvable, validation), les cas limites.
- **Préciser le point d'entrée** dans le WHEN (l'écran, la commande, ou `<Service>::<methode>()` du cas d'usage) tel que l'a établi `@explorateur` : jamais un nom de méthode deviné.
- **Clé de lecture** : vocabulaire partagé, **jeu de données commun** et ce qui n'est **volontairement pas écrit** vont dans `## Clé de lecture des scénarios` ; les scénarios y renvoient. `Aucune` si les scénarios se lisent seuls.
- **Cohérence spec parallèle** : aucun GWT ne contredit un `SP-*` ✅ en vigueur. Si le besoin l'exige → `## Ambiguïtés à valider`, puce commençant par `[AMENDE SP-XXX]`.
- En cas de doute sur ce qu'il faut tester : poser la question à l'utilisateur plutôt qu'écrire le GWT.

### Edge cases identifiés (étape 1)

| # | Edge case | GWT associé | Statut |
|---|---|---|---|
| EC-1 | <description> — règle source : <…> | E3 | ✅ couvert |
| EC-2 | <description> — règle source : <…> | — | ❌ non couvert (justification) |

- Un edge case **se dérive d'une règle existante** (spec, `SP-*`) ou d'une **contrainte technique** du `## Contexte technique`, et cite sa source. Jamais d'edge case générique ni de remplissage.
- Chacun a un GWT associé, ou est `❌ non couvert` avec justification (hors scope, exclu par le PO).
- `Aucun` est une réponse **valide et attendue**.

### Signalements meta (le raffineur ne les écrit jamais)

Chaque proposition est une **puce qui commence par son tag**, écrite dans `## Ambiguïtés à valider`, pour que le Build et le contrôle de livraison la retrouvent :
- règle de comportement / flux / calcul hors spec → `- [À CONSIGNER] <règle> — source : <…>` (spec parallèle) ;
- règle déjà consignée à changer → `- [AMENDE SP-XXX] <changement>` ;
- définition d'entité ou terme à corriger → `- [À CONSIGNER] glossaire : <terme> — <proposition>`.

## Étape 1 — Challenge

**Systématique** : une fois les GWT et edge cases rédigés, invoquer `@challenger` en lui indiquant les sections à lire : `## Registre des décisions`, `## Contexte technique`, `## Clé de lecture des scénarios`, les deux sections de scénarios, `## Edge cases identifiés`, `## Ambiguïtés à valider`.

- Présenter chaque écart à l'utilisateur, qui l'**arbitre** : edge case ajouté, THEN ajouté ou corrigé, test existant à mettre à jour, ou écart refusé (avec sa raison). Chaque arbitrage passe au Registre.
- Reporter le résultat dans `## Arbitrages du challenge (étape 1)` : une ligne par écart (cible, arbitrage, où il est répercuté). `Aucun écart` si le challenger n'en a rapporté aucun.
- Un arbitrage qui **ajoute des scénarios** → nouveau passage de `@challenger`, limité aux scénarios ajoutés.

## Jalon 1→2 (GWT → tests) — Definition of Ready

Le contrôle (skill `controle-livraison` (`workflow-kit/core/skills/controle-livraison/SKILL.md`)) tourne deux fois :
- **fin de l'étape 1, avant l'arrêt 2** (ligne 1 encore `🔄`) : **un seul WHEN** et **au moins un THEN** par scénario, chaque edge case `✅ couvert` relié à un scénario et chaque `❌ non couvert` justifié, aucune case ouverte dans `## Questions specs`. `[KO]` → le raffineur corrige **avant** de présenter les GWT ;
- **jalon 1→2** (ligne 1 à OK, après l'arrêt 2) : en plus, aucune case ouverte dans `## Ambiguïtés à valider` (tranchées à l'arrêt 2), `## Contexte technique` et `## Arbitrages du challenge` remplis, chaque écart arbitré. `[KO]` → pause.

Le raffineur vérifie en plus (jugement) :
- [ ] Les termes métier des GWT figurent dans `.agents/domain-glossary.md` (vérifié par `@doc`), ou sont explicitement validés
- [ ] Aucun GWT ne contredit un `SP-*` en vigueur : sinon `[AMENDE SP-XXX]` dans `## Ambiguïtés à valider`, tranché à l'arrêt 2
- [ ] Questions de `## Questions specs (étape 0)` et edge cases **sourcés** (source + trou / règle source), ou `Aucune` / `Aucun`
- [ ] Chaque arbitrage du challenge est répercuté là où il le dit (EC, scénario, Registre)
- [ ] Si un scénario est ambigu ou incomplet → **pause utilisateur**, le fichier n'est pas prêt

**ARRÊT 2** : présenter les GWT, les edge cases et les arbitrages, puis attendre la validation de l'utilisateur.

**Passage à la réalisation :** jalon franchi, le raffineur annonce que le fichier est prêt et propose à l'utilisateur d'ouvrir une **nouvelle** session avec `/realiser [feature]` (skill `realiser`), qui charge `workflow-kit/core/phase-realisation.md` avant d'invoquer `@test`.

## Rappel depuis la réalisation

Quand la réalisation découvre un **trou métier** (comportement que les GWT ne spécifient pas), l'utilisateur rappelle le raffineur : en basculant sur l'agent raffineur (opencode), en rouvrant la session de raffinement, ou par `/raffiner` dans une nouvelle session. Une simple **formulation** (THEN imprécis, renumérotation, référence fausse) se corrige sur place par le Build.

1. Le Build inscrit le backtrack au Registre et passe les lignes concernées à `🔁 à refaire` (`workflow-kit/core/agent-workflow.md` § « Protocole de backtrack »), puis **s'arrête** : il ne mène jamais le raffinement lui-même et propose d'ouvrir une nouvelle session de raffinement (`/raffiner [feature]`).
2. Le raffineur reprend **sur le seul point en question** : relecture ciblée des sections, `@doc` / `@explorateur` si besoin, mise à jour des GWT avec l'utilisateur.
3. **Gel limité** : `@challenger` sur les scénarios ajoutés ou modifiés, contrôle de livraison, validation de l'utilisateur. La réalisation reprend à `@test` sur ces seuls scénarios.

## Chevauchement de features (étapes 0-1 en avance)

Pendant l'auto-gate 4→5 d'une feature A, l'utilisateur peut ouvrir une **autre session** de raffinement pour les étapes 0-1 d'une feature B (le lot suivant). Le raffineur et ses sous-agents ne lisent que les specs et le code, et n'écrivent que le `.md` de B : aucun conflit de code.

- **B s'arrête à l'arrêt 2.** Son jalon 1→2 n'est franchi **qu'après le passage DONE de A** : le contrôle « aucun GWT ne contredit un `SP-*` en vigueur » porte alors sur les nuances de A, y compris celles issues d'un backtrack de A.
- **Marqueur d'attente** : en-tête du `.md` de B, ligne `> En attente : jalon 1→2 après DONE de <slug-A>`, retirée au franchissement du jalon.
- **A est prioritaire** : un backtrack de A se traite avant toute reprise de B.
- **Choix de B** : un lot dont les règles métier ne dépendent pas de A ; en cas de doute, ne pas chevaucher.
- **Commit** : le commit de livraison de A n'embarque pas le `.md` de B.
- **Un seul chevauchement à la fois** ; jamais d'étape 2 ou au-delà sur B tant que A n'est pas DONE.
