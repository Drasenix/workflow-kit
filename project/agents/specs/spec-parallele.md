# <Projet> : Specs parallèles (amendements validés au spec officiel)

> **Rôle** : registre des **règles métier validées** qui amendent, précisent ou étendent le spec officiel (immuable).
>
> **Primauté** : une entrée `SP-*` **en vigueur** prime sur la page officielle correspondante.
>
> **Périmètre** : règles de **comportement / flux / calculs**. Définitions d'entités → `.agents/domain-glossary.md`. Méthodes de code → `.agents/reference-utilitaires.md`.
>
> **Écriture** : **Build uniquement**, après validation explicite de l'utilisateur, à la **recette nuances de l'étape 6**. `@specs` et `@review` détectent et proposent, ils n'écrivent jamais.
>
> **Lecture** : jamais le fichier entier. Index puis entrées ciblées (grep).
>
> **Cycle de vie** : une règle qui change = nouvelle entrée + ancienne marquée caduque. Jamais de réécriture de l'histoire.
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

- **Statuts** : `en vigueur (validé YYYY-MM-DD)` · `hypothèse (retenue provisoire, en attente de confirmation)` · `caduc (→ SP-…)`
- **Types** : `AMENDE` (remplace la page) · `PRECISE` (complète une règle) · `ETEND` (cas non couvert)

## Contrôle d'intégrité

> Exécuté par `@review` à l'étape 5 et par le Build après chaque écriture. 4 vérifications, tout écart = signalement.

1. **Index ↔ entrées** : autant de lignes `| SP-…` que d'entrées `### SP-…`, mêmes IDs.
2. **Statuts cohérents** : statut de l'index = ligne `> **Statut**` de l'entrée.
3. **Supersessions valides** : chaque cible de `caduc (→ SP-…)` / `**Remplace**` existe comme entrée.
4. **Mots-clés présents** : chaque entrée porte `> **Mots-clés** : …`.

---

## Entrées

> Format d'une entrée (à dupliquer) :
>
> ### SP-<DOM>-01 : <titre>
>
> > **Statut** : en vigueur (validé YYYY-MM-DD) · **Type** : AMENDE / PRECISE / ETEND
> > **Ancre officielle** : <Partie.Section> (p. X)
> > **Source** : feature `<chemin DONE>`
> > **Remplace** : SP-… *(si applicable)*
> > **Mots-clés** : <mot1>, <mot2>
> > **Gardé par** : `<Test>::<methode>`
>
> **Règle.** <règle en vigueur, langage métier>
>
> **Cas limites.**
> - <cas>
