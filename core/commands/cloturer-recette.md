---
description: Clôture une recette terminée (environnement du worktree, worktree, branche recette/<feature> locale et distante, résidus) ; le dossier de livraison est gardé
---

Charge la skill `cloturer-recette` et applique-la à la recette suivante : $ARGUMENTS

Si aucune recette n'est fournie, cherche les branches `recette/*` (locales, worktrees, `origin`) : une seule → prends-la ; plusieurs → demande laquelle ; aucune → dis qu'il n'y a pas de recette à clôturer.
