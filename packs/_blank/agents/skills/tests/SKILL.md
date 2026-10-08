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
