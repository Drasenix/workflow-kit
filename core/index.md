# Index du workflow : routage de lecture

> Carte de routage : **qui** lit **quoi**, à **quel moment**. C'est la conscience bon marché de l'orchestrateur.
> Chargée par la skill `consult-workflow` (socle commun, appelé par les points d'entrée `/raffiner` et `/realiser`).
>
> **Interface de fichiers** : les noms de fichiers de `.agents/` (ex. `ui-rules.md`, `templates-index.md`) sont **l'interface stable** du core — des rôles génériques. Le core les référence en dur ; chaque projet les remplit selon sa propre approche. **Aucun mécanisme de slot** ; `workflow.config.json` ne porte que la `stack` et les runtimes.
>
> **Index canonique du projet** (lu par les outils IA) : `AGENTS.md`.

## Agents principaux

| Agent | Prompt | Session | Rôle |
|---|---|---|---|
| raffineur | `workflow-kit/core/agents/raffineur.md` | raffinement (étapes 0-1) — session lancée sur l'agent `raffineur`, ou agent par défaut qui en endosse le rôle (skill `raffiner`) | mène la conversation avec l'utilisateur, rédige le fichier de feature jusqu'au gel ; délègue la lecture à `@doc`, `@explorateur`, `@challenger` |
| Build | — (agent par défaut de l'outil) | réalisation (étapes 2-7) — session neuve ouverte par `/realiser` (skill `realiser`) | orchestre `@test`, `@dev` (plan puis code), `@review`, puis le test global, le résumé métier et le passage DONE |

## Subagents

| Agent | Prompt | Étapes | Écrit | N'écrit jamais |
|---|---|---|---|---|
| `@explorateur` | `workflow-kit/core/agents/explorateur.md` | 0 : faits sur le code (point d'entrée, comportement actuel, tests, contraintes) | rien (réponse au raffineur) | — |
| `@challenger` | `workflow-kit/core/agents/challenger.md` | 1 : écarts entre les GWT et le code / le spec parallèle | rien (réponse au raffineur) | — |
| `@test` | `workflow-kit/core/agents/test.md` | 2 : tests rouges, fichier unique | tests, marques `⏭️` de `.agents/feature/<slug>.md` | code applicatif, fichiers meta |
| `@dev` | `workflow-kit/core/agents/dev.md` | 3 : plan ; 4 : code minimal vert (repris ou réinvoqué) ; backtrack refacto | `## Plan (étape 3)` (dont écarts au plan, nouveaux utilitaires), code | fichiers meta |
| `@review` | `workflow-kit/core/agents/review.md` | 5 : revue qualité + plan de refacto + récapitulatif des décisions techniques | sa section `## Revue qualité (étape 5)` | code, `## Progression`, fichiers meta |
| `@doc` | `workflow-kit/core/agents/doc.md` (commande `/doc` : `workflow-kit/core/commands/doc.md`) | 0-1 : specs en mode raffinement ; hors workflow : questions métier, lecture seule | rien | — |

Les subagents reçoivent leur prompt par l'outil de délégation : **ni le Build ni le raffineur ne lisent** `workflow-kit/core/agents/*.md` (seule exception : la skill `raffiner` fait lire `raffineur.md` à l'agent principal qui en endosse le rôle). Ils ne s'invoquent pas entre eux. Fichiers meta (`.agents/reference-utilitaires.md`, `.agents/domain-glossary.md`, `.agents/specs/spec-parallele.md`, fichiers-rôles `.agents/*.md`) : écrits **par le Build seul**, cf. `workflow-kit/core/agent-build.md` § Fichiers meta.

## Détail par étape

L'agent principal (raffineur ou Build) lit **toujours** `workflow-kit/core/index.md`, `workflow-kit/core/agent-workflow.md`, `workflow-kit/core/agent-build.md` (règles communes), puis `.agents/feature/<slug>.md` par sections. Il charge en plus **une seule phase**, par le point d'entrée de sa session (colonne « Phase ») :

| Phase | Étapes | Règles propres | Chargée quand |
|---|---|---|---|
| Raffinement | 0-1 | `workflow-kit/core/phase-raffinement.md` | `/raffiner [feature]` (skill `raffiner`), ou session lancée sur l'agent `raffineur` |
| Réalisation | 2-7 | `workflow-kit/core/phase-realisation.md` | `/realiser [feature]` (skill `realiser`), dans une session neuve, raffinement gelé |

| Étape | Phase | Agent principal lit | Subagent lit (hors `.agents/feature/<slug>.md`) | Sections de `.agents/feature/<slug>.md` transmises au subagent |
|---|---|---|---|---|
| 0 (compréhension) | Raffinement | raffineur : Progression, Registre ; pour un lot : ligne du `BACKLOG`, sections citées du `SPECS` ; web ciblé (sources externes) | `@doc` : protocole de `workflow-kit/core/skills/doc/SKILL.md` (index de `.agents/specs/spec-parallele.md` + entrées, `.agents/specs/README.md` → `.agents/specs/spec.txt` ciblé, `.agents/domain-glossary.md` ciblé) ; `@explorateur` : code et tests ciblés, `.agents/architecture.md`, `.agents/test-rules.md` | aucune : périmètre et questions transmis par le raffineur |
| 1 (GWT + challenge) | Raffinement | raffineur : Progression, Registre, sections qu'il rédige | `@challenger` : code et tests ciblés, `SP-*` du périmètre dans `.agents/specs/spec-parallele.md`, `.agents/test-rules.md` | `@challenger` : Registre, Contexte technique, Clé, scénarios, Edge cases, Ambiguïtés |
| 2 (test rouge) | Réalisation | Progression, Registre, `.agents/templates-index.md` | `@test` : `.agents/test-rules.md`, `.agents/skills/tests/SKILL.md`, `.agents/templates-index.md` (templates de test) | Registre, Contexte technique, Clé, scénarios, Edge cases |
| 3 (plan) | Réalisation | Progression, Registre, Plan (présenté à la pause 3) | `@dev` : `.agents/conventions.md`, `.agents/architecture.md`, (`.agents/stack.md`), `.agents/reference-utilitaires.md` ciblé, `SP-*` cités dans `.agents/specs/spec-parallele.md`, (`.agents/ui-rules.md` / `.agents/component-rules.md` selon périmètre), code ciblé | Registre, Contexte technique, Clé, scénarios, Edge cases |
| 4 (dev vert) | Réalisation | Progression, Registre, `.agents/templates-index.md` | `@dev` : `.agents/conventions.md`, `.agents/templates-index.md`, `.agents/reference-utilitaires.md` ciblé, `.agents/skills/tests/SKILL.md`, (`.agents/ui-rules.md` / `.agents/component-rules.md`) | repris : rien de plus ; réinvoqué : Registre, Plan (étape 3), ADR ; refacto : Registre, Plan de refacto |
| 5 (revue) | Réalisation | Progression, Registre, Décisions techniques (présentées à la pause 5) | `@review` : `.agents/conventions.md`, `.agents/test-rules.md`, `.agents/reference-utilitaires.md` ciblé, `SP-*` du périmètre dans `.agents/specs/spec-parallele.md`, (`.agents/ui-rules.md` / `.agents/component-rules.md`) | Registre, scénarios, Edge cases, Plan, ADR, Conventions (fichiers-rôles) |
| 6 (nuances) | Réalisation | Registre, ADR, puces `[À CONSIGNER]`/`[AMENDE SP-*]`, Conventions, Nuances | — | — |
| 7 (DONE) | Réalisation | Progression + contrôle de livraison | — | — |

> **Lecture ciblée** (tous) : `.agents/reference-utilitaires.md` et `.agents/domain-glossary.md` = sommaire `grep -n '^## \|^### '` → grep des mots-clés → blocs `### …` retenus ; `.agents/specs/spec-parallele.md` = index → entrées. Jamais en entier.
> `.agents/ui-rules.md` (UI) / `.agents/component-rules.md` (composants/exports) : **selon le périmètre**, auto-évalué par le subagent, jamais préchargés, jamais lus par `@test`.

## Hors workflow (opt-in / grep uniquement)

`DONE-*.md`, `ABANDON-*.md`, `IRREPRODUCTIBLE-*.md`, `PLAN-*.md`, `REFACTO-*.md`, `doc/*.md` (living docs), docs de chantier PO (`.agents/feature/**/SPECS.md`, `BACKLOG.md`, `FICHE-REUNION.md`), images `.agents/feature/**/maquettes/**` : jamais auto, sur demande explicite ou grep ciblé. Compaction : `workflow-kit/core/templates/feature-cloturee.md` (skill `compacter-feature`).

## Skills (chargement à la demande)

| Skill | Charger quand |
|---|---|
| `consult-workflow` | socle commun, appelé par `raffiner` et `realiser` ; seul (« consulte le workflow ») : dit où en est la feature et quelle commande lancer, sans charger de phase |
| `raffiner` | `/raffiner [feature]` : point d'entrée du raffinement — socle + `phase-raffinement.md` ; dans une session non lancée sur l'agent raffineur, l'agent principal en endosse le rôle |
| `realiser` | `/realiser [feature]` : point d'entrée de la réalisation — garde-fous (session neuve, raffinement gelé, Definition of Ready), socle + `phase-realisation.md` |
| `cadrage-po` | « je commence [sujet] » en mode cadrage PO / mise en place du chantier (SPECS/BACKLOG/FICHE-REUNION) |
| `doc` | question métier / cliente / audit rapide (« comment ça marche X ? ») — lecture seule, réponse en deux blocs |
| `.agents/skills/tests/SKILL.md` | avant tout run de test (ciblé ou global) : commandes, calibrage, fallback |
| `.agents/skills/recette/SKILL.md` | après une US passée en `DONE-*` : recette manuelle (scénarios + seeder jetable) |
| `controle-livraison` | **lancée par l'agent principal** (raffineur à la fin de l'étape 1 et au jalon 1→2, Build au jalon 6→7), avant de proposer tout commit contenant un fichier de feature, et après chaque backtrack ; ou à la demande (`/controle-livraison`) : traces meta non tranchées, Progression incohérente |
| `compacter-feature` | après le commit de livraison d'un fichier clos (`DONE-*`, `ABANDON-*`, `IRREPRODUCTIBLE-*`) : compaction (garde l'apprentissage, retire le pilotage) |

> Une skill n'est **pas** toujours chargée : déclenchement par sa `description` + pointeur depuis une règle toujours chargée. **Ne jamais y déplacer un garde-fou.**

## Contrôle mécanique

Skill `controle-livraison` (`workflow-kit/core/skills/controle-livraison/SKILL.md`), script `node workflow-kit/bin/workflow-kit.mjs check .agents/feature/<chemin>/<slug>.md` : lancé **par l'agent principal** (aucun hook) — le raffineur à la fin de l'étape 1 et au jalon 1→2, le Build au jalon 6→7, avant de proposer tout commit contenant un fichier de feature, et après chaque backtrack. Structure toujours contrôlée (statuts reconnus, Progression cohérente, backtrack au Registre) ; étape 1 en cours ou faite : format des scénarios et des edge cases, questions tranchées ; étape 1 faite : ambiguïtés tranchées, contexte technique et arbitrages du challenge remplis (Definition of Ready) ; étapes 3, 4 et 5 faites : plan, écarts au plan et décisions techniques remplis (sections du gabarit à deux phases) ; à la livraison (étape 6 faite) : aucune trace meta non tranchée, intégrité du spec parallèle et références mortes des fichiers meta. Ces deux derniers seuls : `node workflow-kit/bin/workflow-kit.mjs check-meta` (`--spec` / `--refs`), pour `@review` et après chaque écriture du spec parallèle.
