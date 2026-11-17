---
description: Compacte un fichier de feature clos (DONE, ABANDON, IRREPRODUCTIBLE), avant ou après son commit de livraison
---

Charge la skill `compacter-feature` et applique sa procédure (squelette par `workflow-kit compact` → lecture du résiduel → rédaction des sections marquées → `compact --check` → pause) au fichier suivant : $ARGUMENTS

Si aucun fichier n'est fourni, demande lequel. Rappel : aucun commit préalable requis, nom du fichier inchangé, commit uniquement sur demande explicite.
