# <Projet> : Specs parallèles (amendements validés au spec officiel)

> **Rôle** : registre des **règles métier validées** qui amendent, précisent ou étendent le spec officiel (immuable).
>
> **Primauté** : une entrée `SP-*` **en vigueur** prime sur la page officielle correspondante.
>
> **Périmètre** : règles de **comportement / flux / calculs**. Définitions d'entités → `.agents/domain-glossary.md`. Méthodes de code → `.agents/reference-utilitaires.md`.
>
> **Écriture** : **Build uniquement**, après validation explicite de l'utilisateur, à la **recette nuances de l'étape 6**, ou à la **clôture d'un chantier PO** (`/cloturer-chantier`, skill `cadrage-po`). Le raffineur et `@review` détectent et proposent, ils n'écrivent jamais.
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
- **Gardé par** (convention du projet) : `tests` — les tests qui gardent la règle (`<Test>::<methode>`) ; en attente : `à compléter à l'étape 6 du lot qui l'implémente`. *(Autre convention possible : `feature` — la feature qui implémente la règle, `<id> (`DONE-<slug>.md`)` ; en attente : `— (feature à venir)`. Une seule par projet.)*

## Contrôle d'intégrité

> Mécanique, ne se fait pas à la main : `node .agents/specs/verifier-spec.mjs` (Node seul, fonctionne **sans le kit** ; copie tenue par workflow-kit, ne pas la modifier). Avec le kit, `node workflow-kit/bin/workflow-kit.mjs check-meta --spec` lance le même contrôle. Exécuté par `@review` à l'étape 5, par le Build après chaque écriture, et par quiconque modifie ce fichier hors du workflow. 5 vérifications, tout écart = signalement.

1. **Index ↔ entrées** : autant de lignes `| SP-…` que d'entrées `### SP-…`, mêmes IDs.
2. **Statuts cohérents** : statut de l'index = ligne `> **Statut**` de l'entrée.
3. **Supersessions valides** : chaque cible de `caduc (→ SP-…)` / `**Remplace**` existe comme entrée.
4. **Mots-clés présents** : chaque entrée porte `> **Mots-clés** : …`.
5. **Renvois réciproques** : une règle en vigueur citée dans la ligne `**Amende**` d'une autre porte `**Amendé par**` vers elle (vers son successeur si l'amendeur est devenu caduc).

---

## Entrées

> Format d'une entrée (à dupliquer) :
>
> ### SP-<DOM>-01 : <titre>
>
> > **Statut** : en vigueur (validé YYYY-MM-DD) · **Type** : AMENDE / PRECISE / ETEND
> > **Ancre officielle** : <Partie.Section> (p. X)
> > **Source** : feature `<chemin DONE>` *(ou, à la clôture d'un chantier PO : cadrage PO <sujet>, décision du <date>)*
> > **Remplace** : SP-… *(si applicable)*
> > **Mots-clés** : <mot1>, <mot2>
> > **Gardé par** : `<Test>::<methode>` *(selon la convention déclarée dans « Statuts & types » ; avant implémentation : son marqueur d'attente)*
>
> **Règle.** <règle en vigueur, langage métier>
>
> **Cas limites.**
> - <cas>
