# Index `.opencode` : routage de lecture

> Carte de routage : **qui** lit **quoi**, à **quel moment**. C'est la conscience bon marché de l'orchestrateur.
> Chargée par la skill `consult-workflow` (déclenchée par « consulte .opencode ») et en début de feature.
>
> **Interface de fichiers** : les noms de fichiers de `.agents/` (ex. `ui-rules.md`, `templates-index.md`) sont **l'interface stable** du core — des rôles génériques. Le core les référence en dur ; chaque projet les remplit selon sa propre approche (le **contenu** peut diverger d'un projet à l'autre). **Aucun mécanisme de slot** ; `workflow.config.json` ne porte que la `stack`.
>
> **Index canonique du projet** (lu par les outils IA) : `AGENTS.md`.

## Règle générale

- **L'agent Build ne lit jamais** le contenu des fichiers destinés aux subagents : ils reçoivent leur prompt via `Task` et les chargent eux-mêmes au point d'usage.
- **Lire uniquement ce qui concerne l'étape en cours**, pas tout le dossier par défaut.
- La **profondeur** (living docs, docs de chantier PO `SPECS.md`/`BACKLOG.md`/`FICHE-REUNION.md`, `DONE-*`, `doc/`) reste disponible **sur demande explicite** ou via grep ciblé.

## Table de routage

| Fichier | Build | @specs | @test | @architect | @dev | @review | @doc |
|---|---|---|---|---|---|---|---|
| `.opencode/agent-opencode.md` | lecture | | | | | | |
| `.opencode/agent-workflow.md` | lecture | | | | | | |
| `.opencode/index.md` (ce fichier) | lecture | | | | | | |
| `.agents/templates-index.md` | début feature | | é2 | | é4 | é5 | |
| `.agents/feature/<slug>.md` actif | lecture | é0-1 | é2 | é3 | é4 | é5 | |
| `DONE-*.md`, `ABANDON-*.md`… | opt-in/grep | | | | | | |
| `.agents/feature/**/SPECS.md`, `BACKLOG.md`, `FICHE-REUNION.md` (chantier PO) | opt-in/grep | | | | | | |
| `.agents/feature/**/maquettes/**` (images) | opt-in/grep | | | | | | |
| `.opencode/agents/<son>.md` | auto via `Task` | (le sien) | (le sien) | (le sien) | (le sien) | (le sien) | (le sien) |
| `.agents/ui-rules.md` | | | | | é4 si UI | é5 si UI | |
| `.agents/component-rules.md` | | | | | é4 si composants/exports | é5 si composants/exports | |
| `.agents/reference-utilitaires.md` | | garde-fou seul | garde-fou seul | é3 | é4 | é5 | |
| `.agents/conventions.md` / `.agents/conventions.md` / `.agents/architecture.md` | | | | é3 | é4 | é5 | |
| `doc/*.md` (living docs) | opt-in | | | | | | opt-in |
| `.agents/templates-index.md` et templates pack | | | copie TU/TI | | copie | vérif | |

## Détail par étape du workflow

| Étape | Build lit | Subagent lit (via son prompt) |
|---|---|---|
| 0-1 (specs) | `.agents/feature/<slug>.md` | `@specs` : `.agents/specs/spec.txt` + `.agents/specs/spec-parallele.md` + `.agents/domain-glossary.md` |
| 2 (test rouge) | `.agents/feature/<slug>.md`, `.agents/templates-index.md` | `@test` : GWT, templates TU/TI, `.agents/skills/tests/SKILL.md`, `.agents/test-rules.md` |
| 3 (archi) | `.agents/feature/<slug>.md` | `@architect` : GWT + edge cases, `.agents/conventions.md`, `.agents/conventions.md`, `.agents/reference-utilitaires.md` |
| 4 (dev vert) | `.agents/feature/<slug>.md`, `.agents/templates-index.md` | `@dev` : archi + tests + `.agents/reference-utilitaires.md` + `.agents/conventions.md` + `.agents/conventions.md` |
| 5 (revue) | `.agents/feature/<slug>.md`, `.agents/templates-index.md` | `@review` : code + GWT + `.agents/reference-utilitaires.md` + `.agents/conventions.md` + `.agents/conventions.md` |
| 6 (nuances) | `.agents/feature/<slug>.md` | |
| 7 (DONE) | `.agents/feature/<slug>.md` | |

> `.agents/ui-rules.md` (UI) / `.agents/component-rules.md` (composants/exports) : chargés **selon le périmètre**, auto-évalué par le subagent concerné, jamais préchargés.

## Skills (chargement à la demande)

| Skill | Charger quand |
|---|---|
| `consult-workflow` | « consulte .opencode » / début de feature : pilote le lazy-loading |
| `cadrage-po` | « je commence [sujet] » en mode cadrage PO / mise en place du chantier (SPECS/BACKLOG/FICHE-REUNION) |
| `doc` | question métier / cliente / audit rapide (« comment ça marche X ? ») — lecture seule, réponse en deux blocs |
| `.agents/skills/tests/SKILL.md` | avant tout run de test (ciblé ou global) : commandes, calibrage, fallback |
| `.agents/skills/recette/SKILL.md` | après une US passée en `DONE-*` : recette manuelle (scénarios + seeder jetable) |

> Une skill n'est **pas** toujours chargée : déclenchement par sa `description` + pointeur depuis une règle toujours chargée. **Ne jamais y déplacer un garde-fou.**

## Garde-fous

- `@test` / `@specs` : `.agents/reference-utilitaires.md` = **ne jamais modifier** (garde-fou d'écriture, pas de lecture obligatoire).
- `.agents/ui-rules.md` / `.agents/component-rules.md` : lus par `@architect`, `@dev` et `@review` **uniquement** (jamais `@test`), et **seulement selon le périmètre** (UI / composants, auto-évalué).
- `agents/*.md` : prompts auto-injectés par `Task`, le Build ne doit **jamais** les précharger.
