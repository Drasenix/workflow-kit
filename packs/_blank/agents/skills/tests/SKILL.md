---
name: "tests"
description: "Execution des tests : run cible, run global, calibrage, fallback. A completer pour la stack du projet."
---

# tests

> Squelette du pack `_blank`. Charger cette skill avant de lancer les tests.

## Commandes

```bash
<test cible>
<test global>
```

## Regles d'execution

- Runs cibles des subagents : sans parallelisme.
- Run global : reserve au Build, en fin de workflow.

## Fallback

Si l'outil n'est pas accessible localement : `<fallback shell>`.

## Tests qui gardent les regles de la spec parallele

- Un test renomme ou supprime rend fausse la ligne « Garde par » qui le cite : `node .agents/specs/verifier-spec.mjs` le controle (6e verification, toute techno). A lancer a l'etape 6 et apres tout renommage ou suppression de test.
