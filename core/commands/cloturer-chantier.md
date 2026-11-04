---
description: Clôture un chantier PO (décisions vers la spec parallèle, un fichier LOT-* par lot, suppression de SPECS/BACKLOG/FICHE-REUNION)
---

Charge la skill `cadrage-po`, puis déroule sa section « Clôture du chantier » pour le dossier suivant : $ARGUMENTS

Si aucun dossier n'est fourni, cherche les dossiers de `.agents/feature/` qui contiennent encore un `SPECS.md` : un seul → propose-le ; plusieurs → demande lequel ; aucun → dis qu'il n'y a pas de chantier à clôturer.

Cette commande écrit dans la spec parallèle et le glossaire : elle se lance dans une session **Build**, jamais dans une session de raffinement.
