---
name: "recette"
description: "Recette manuelle post-DONE : scenarios utilisateur + jeu de donnees jetable local. A completer pour la stack du projet."
---

# recette

> Squelette du pack `_blank`. Charger cette skill apres une US passee en `DONE-*`.

## Declenchement

- `/recette`, « recette manuelle », « je dois tester » apres une US livree.

## Garde-fous

1. Jamais en production/staging : verifier l'environnement local avant tout seed.
2. Jeu de donnees jetable et isole, jamais reference par les seeders existants.

## Workflow

1. Analyser la `DONE-*`.
2. Deriver les scenarios utilisateur (Etant donne / Quand je / Alors je dois voir).
3. Creer un jeu de donnees jetable si l'etat n'est pas atteignable via l'UI.
4. Executer en local et rapporter.
