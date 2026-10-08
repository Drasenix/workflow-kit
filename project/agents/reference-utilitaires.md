# Référence : Utilitaires et méthodes réutilisables

> Fichier maintenu à chaque feature (étapes 3 et 5), sur validation explicite de l'utilisateur.
>
> Objectif : éviter la duplication. Avant d'écrire une nouvelle méthode, vérifier ici si l'équivalent existe déjà.
>
> **Garde-fou** : aucun agent ne modifie ce fichier sans l'accord explicite de l'utilisateur.

---

## <Domaine 1>

### <Classe>
- **Fichier** : `<chemin>`
- **Type** : Classe statique / Service / Action / Job / Trait
- **Méthodes** :
  - `<methode>(<params>): <return>` : <description>
- **Utilisé par** : `<Classe>`
- **Référence** : <ADR / feature / note de sémantique>

---

## <Domaine 2>

### <Classe>
- **Fichier** :
- **Type** :
- **Méthodes** :
- **Utilisé par** :

---

> Note : documenter explicitement les entrées à sémantique piégeuse (nom trompeur, comportement contre-intuitif, dualité de statuts) pour éviter les régressions lors d'une réutilisation.
