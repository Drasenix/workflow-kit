---
description: Analyse le code à une date passée (tags prod) pour diagnostiquer un ticket antidaté
---

Charge la skill `analyse-flashback` et applique son workflow (date cible → tag prod → lecture via `git show` → comparaison → diagnostic) pour le ticket / la date suivante : $ARGUMENTS

Si la date ou le domaine concerné n'est pas fourni, demande-le avant de commencer. Rappel : lecture seule, aucune modification de l'état de travail.
