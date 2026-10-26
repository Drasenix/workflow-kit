---
description: Contrôle de livraison d'un fichier de feature (Progression cohérente, aucune trace meta non tranchée)
---

Charge la skill `controle-livraison` et applique sa procédure (script `workflow-kit check` → écarts tranchés avec l'utilisateur → relance jusqu'à `[ok]`) au fichier suivant : $ARGUMENTS

Si aucun fichier n'est fourni, prends la feature en cours (fichier de `.agents/feature/` sans préfixe de clôture) ; en cas de doute, demande lequel.
