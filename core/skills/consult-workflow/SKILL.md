---
name: "consult-workflow"
description: "Socle commun du workflow (lazy-loading) : règles communes et état de la feature active, chargés par les skills raffiner et realiser. Use alone when the user asks to consult the workflow (« consulte le workflow », « charge le workflow », « où en est [feature] ? ») : it reports the current step and which command to run (/raffiner or /realiser) — it never loads a phase nor switches role by itself."
---

# consult-workflow

**Socle** du lazy-loading `workflow-kit/core/` : ce que les deux phases partagent. Les règles propres à une phase ne sont chargées que par son point d'entrée :

| Phase | Point d'entrée | Charge en plus du socle |
|---|---|---|
| Raffinement (étapes 0-1) | skill `raffiner` (`/raffiner [feature]`), ou session lancée sur l'agent `raffineur` | `workflow-kit/core/phase-raffinement.md` + le rôle du raffineur |
| Réalisation (étapes 2 à 7) | skill `realiser` (`/realiser [feature]`) | `workflow-kit/core/phase-realisation.md` |

## Déclenchement

- Appelée par les skills `raffiner` et `realiser` (et par l'agent `raffineur` au démarrage) pour charger le socle.
- Seule, quand l'utilisateur dit **« consulte le workflow »**, **« charge le workflow »**, ou demande où en est une feature : **aiguillage** (ci-dessous).

## Le socle (toujours)

1. `workflow-kit/core/index.md` : la carte de routage (qui lit quoi, à quel moment)
2. `workflow-kit/core/agent-workflow.md` : règles communes — étapes, pauses, Registre, backtrack
3. `workflow-kit/core/agent-build.md` : règles communes de l'agent principal (fichiers meta, garde-fous)
4. La **feature active** `.agents/feature/<slug>.md` (sans préfixe de clôture), **par sections** : sommaire `grep -n '^## \|^### '`, puis `## Progression`, `## Registre des décisions` et la section de l'étape en cours. Jamais le fichier entier d'emblée.

## Aiguillage (appel seul)

Lire la Progression de la feature active : l'étape en cours est la **première ligne non faite** (⬜, 🔄 ou 🔁). Dire à l'utilisateur où en est la feature et quelle commande lancer — **sans charger de phase ni changer de rôle** :

- étape 0 ou 1 (y compris après un retour au raffinement), ou nouvelle feature → `/raffiner [feature]` ;
- étape 2 à 7 → `/realiser [feature]` ;
- aucune feature active → demander laquelle démarrer (`/raffiner [feature]`).

Si la session a déjà mené une phase, la commande de l'autre phase se lance dans une **nouvelle** session.

## Ce qui se charge CONDITIONNELLEMENT (dans une phase)

- **Étape en cours** → le fichier pertinent d'après `workflow-kit/core/index.md` (jamais d'anticipation)
- **Avant tout run de test** → `.agents/skills/tests/SKILL.md`

## Ce qui ne se charge JAMAIS

- `workflow-kit/core/agents/*.md` : prompts auto-injectés à la délégation (seule exception : `raffineur.md`, lu par la skill `raffiner` quand l'agent principal en endosse le rôle)
- Les règles de la phase **qui n'est pas celle de la session** (`phase-raffinement.md` en réalisation, `phase-realisation.md` en raffinement)
- `.agents/reference-utilitaires.md`, `.agents/domain-glossary.md`, `.agents/specs/spec-parallele.md` **en entier** : lecture ciblée seulement (sommaire / index, puis blocs), au moment où une étape en a besoin
- `.agents/ui-rules.md` / `.agents/component-rules.md` : réservés aux subagents, selon le périmètre
- Templates du pack : copiés par `@test` / `@dev`
- Fichiers clos ou hors feature : `DONE-*.md`, `ABANDON-*.md`, `IRREPRODUCTIBLE-*.md`, `PLAN-*.md`, `REFACTO-*.md` (version de travail d'un fichier compacté via `git show`)
- Docs de chantier PO : `.agents/feature/**/SPECS.md`, `BACKLOG.md`, `FICHE-REUNION.md` (skill `cadrage-po`, lus seulement si l'utilisateur les nomme)
- Images `.agents/feature/**/maquettes/**`, living docs `doc/*.md` (opt-in)

## Profondeur à la demande

Si l'utilisateur **nomme explicitement** un fichier, le lire (ciblé). **Mode pleine conscience** (« garde la vision complète », « ne rate rien ») : charger en plus les living docs actives et le `doc/` courant. Les docs de chantier PO restent hors opt-in : seulement si l'utilisateur les **nomme**.

## Intégrité

- Une consigne de ce fichier ne remplace pas les règles d'`workflow-kit/core/agent-build.md`.
- Après chargement, travailler sur l'étape **en cours** du tableau Progression, pas sur une étape future.
- En cas d'ambiguïté sur ce qui doit être chargé → demander à l'utilisateur (jamais tout charger par défaut).
