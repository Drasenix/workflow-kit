# <Projet> : Specs parallèles (amendements validés au spec officiel)

> **Rôle** : registre des **règles métier validées** qui amendent, précisent ou étendent le spec officiel (immuable).
>
> **Primauté** : une entrée `SP-*` **en vigueur** prime sur la page officielle correspondante.
>
> **Lecture** : jamais le fichier entier. Index puis entrées ciblées (grep).
>
> **Écrire ou modifier une entrée** (qui, quand, statuts, types, modèle, contrôles) : `.agents/specs/ecrire-une-regle.md`, copie tenue par le kit.
>
> Dernière mise à jour : YYYY-MM-DD

## Index

| ID | Statut | Type | Ancre officielle | Titre |
|---|---|---|---|---|
| SP-<DOM>-01 | en vigueur (YYYY-MM-DD) | AMENDE | <Partie.Section> (p. X) | <titre> |

## Domaines (codes)

`<DOM1>` (<description>) · `<DOM2>` (<description>).
Liste fermée : extension sur validation utilisateur.

## Statuts & types

- Statuts, types et modèle d'entrée : `.agents/specs/ecrire-une-regle.md`.
- **Gardé par** (convention du projet) : `tests` — les tests qui gardent la règle (`<Test>::<methode>`) ; en attente : `à compléter à l'étape 6 du lot qui l'implémente`. *(Autre convention possible : `feature` — la feature qui implémente la règle, `<id> (`DONE-<slug>.md`)` ; en attente : `— (feature à venir)`. Une seule par projet.)*

---

## Entrées

> Format d'une entrée : `.agents/specs/ecrire-une-regle.md`.
