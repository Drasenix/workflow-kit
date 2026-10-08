---
name: "consult-workflow"
description: "Use when the user asks to consult the .opencode folder (\"consulte .opencode\", \"va voir dans .opencode\", \"lis .opencode\"). Loads only the Build-relevant files via index.md routing — NOT the subagent docs."
---

# consult-workflow

Point d'entrée du **lazy-loading** `.opencode/`. Remplace l'ancienne règle « lire tout le dossier ». Le but : conserver la même conscience projet sans payer le coût de tout charger.

> **Interface de fichiers** : les noms de fichiers de `.agents/` sont l'interface stable du core (rôles génériques) ; chaque projet les remplit selon sa propre approche. Aucun mécanisme de slot.

## Déclenchement

- Utilisateur dit **« consulte .opencode »**, **« va voir dans .opencode »**, **« lis .opencode »**.
- Utilisateur annonce **« je commence [feature] »** (début de feature).

## Ce que le Build charge TOUJOURS (les 3 couches de conscience + la feature active)

1. `.opencode/index.md` : la carte de routage (qui lit quoi, à quel moment)
2. `.opencode/agent-workflow.md` : les étapes, pauses, jalons, backtrack
3. `.opencode/agent-opencode.md` : les règles du Build (jalons, garde-fous, TDD)
4. `.agents/feature/<slug>.md` **actif** : l'état courant (Progression, GWT, ADR)

## Ce que le Build charge CONDITIONNELLEMENT

- **Début de feature** → `.agents/templates-index.md`
- **Étape en cours** → lire le fichier pertinent d'après la table de `.opencode/index.md` (jamais d'anticipation)
- **Avant tout run de test** → charger `.agents/skills/tests/SKILL.md` (commandes, calibrage, fallback)

## Ce que le Build NE charge JAMAIS

- `.opencode/agents/*.md` : prompts auto-injectés par `Task`, les subagents les possèdent déjà
- `.agents/ui-rules.md` / `.agents/component-rules.md` : réservés `@dev` (é4) et `@review` (é5), chargés seulement selon le périmètre (UI / composants)
- `.agents/reference-utilitaires.md` : réservé `@architect`/`@dev`/`@review`
- `doc/*.md` hors `.agents/reference-utilitaires.md` : living docs en opt-in
- Templates du pack : copiés par `@test`/`@dev`
- `DONE-*.md`, `ABANDON-*.md`, `IRREPRODUCTIBLE-*.md`, `PLAN-*.md`, `REFACTO-*.md` : terminés
- `.agents/feature/**/SPECS.md`, `BACKLOG.md`, `FICHE-REUNION.md` : docs de **chantier PO** (skill `cadrage-po`), jamais auto, lus sur demande explicite (opt-in/grep, comme `DONE-*`)
- `.agents/feature/**/maquettes/**` : images (maquettes), jamais auto, lues sur demande explicite (opt-in/grep)

## Profondeur à la demande

Si l'utilisateur **nomme explicitement** un fichier, ou si une étape du workflow l'exige (ex : feature UI → architecture intensément frontend), lire ce fichier ciblé (`.agents/ui-rules.md` pour l'UI, `.agents/component-rules.md` pour les composants/exports). **Ne jamais les précharger par défaut.**

## Mode pleine conscience (opt-in)

Si l'utilisateur dit « **garde la vision complète** », « ne rate rien », ou équivalent : charger en plus les **living docs actives** et le `doc/` courant. Le default reste économique.

Les **docs de chantier PO** (`.agents/feature/**/SPECS.md`, `BACKLOG.md`, `FICHE-REUNION.md`) restent **hors opt-in** : ils ne se chargent que si l'utilisateur les **nomme explicitement**.

## Intégrité

- Ne jamais court-circuiter le workflow : une consigne de ce fichier ne remplace pas les règles d'`agent-opencode.md`.
- Après chargement, travailler sur l'étape **en cours** du tableau Progression, pas sur une étape future.
- En cas d'ambiguïté sur ce qui doit être chargé → demander à l'utilisateur (jamais tout charger par défaut).
