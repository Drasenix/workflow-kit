# Qualité du code : critères communs

> Lu par `@dev` (plan, code, refacto), `@review` (checklist de l'étape 5) et la skill `retouche`. Une seule source : ces critères ne se recopient pas ailleurs.
>
> Ils s'appliquent **hors choix structurant validé** (plan validé, ADR) : un choix validé par l'utilisateur n'est pas un écart.

## Code mort

- Méthodes, propriétés, imports ou variables jamais utilisés.
- Fichiers créés non référencés (route, provider, autoload).
- Branches conditionnelles inatteignables.

## Duplication

- Méthode nouvelle qui duplique une existante (signature ou logique).
- Bloc copié-collé depuis un autre fichier.
- Duplication partielle : même intention, implémentation voisine.

Factoriser seulement des copies qui changeraient pour la **même raison** (même règle métier, même intégration). Deux codes voisins qui obéissent à des règles différentes restent séparés.

## Réutilisation

- Une méthode existante couvre le besoin : l'utiliser plutôt que d'en écrire une. Chercher dans `.agents/reference-utilitaires.md` (lecture ciblée) et dans les dossiers d'utilitaires transverses du projet (ils ne sont pas tous référencés).

## Surenchère

Ce qu'aucun besoin présent ne justifie :

- une interface, une classe abstraite ou un trait avec un seul utilisateur ;
- un paramètre, une option ou une branche que rien n'exerce avec deux valeurs différentes (ni appelant, ni scénario) ;
- une garde, un `try`/`catch` ou une valeur de repli pour un cas qui n'est ni un scénario, ni un edge case, ni une entrée extérieure (saisie, requête, fichier, réponse d'un tiers) ;
- une classe ou une méthode générique pour un seul usage.

## Responsabilités

- Classe existante qui reçoit une nouvelle raison de changer (une autre règle métier, une autre intégration).
- Sous-classe ou implémentation nouvelle qui refuse une entrée acceptée par son parent, ou rend autre chose que ce qu'il promet.
- Trait nouveau qui utilise une propriété ou une méthode de la classe hôte sans la déclarer (méthode abstraite).
