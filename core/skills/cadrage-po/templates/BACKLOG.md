# <Sujet> — Backlog dev

> Roadmap ordonnée des lots de développement. **Specs métier** : `SPECS.md` (même dossier).
> **Convention** : un lot = une feature exécutable. À la clôture du chantier (`/cloturer-chantier`), chaque ligne de lot devient `LOT-<nn>-<slug>.md` dans ce dossier, puis ce fichier est supprimé.
>
> Parcours : **<étape 1> → <étape 2> → <étape 3> → …**.

## Lots par étape du cycle de vie

| Étape | Ordre | Lot | US | Q bloquantes | Dépend de | Nature |
|---|---|---|---|---|---|---|
| <étape 1> | 1 | F1 — <lot> | US-… | Q… | — | <nature> |
| <étape 1> | 2 | F2 — <lot> | US-… | Q… | F1 | <nature> |
| <étape 2> | 3 | F3 — <lot> | US-… | Q… | — | <nature> |

- **Couverture US** : US-1 à US-n toutes mappées.

## Ordre d'exécution (releases)

```
Release 0 — tracer bullet
  F1, F2

Release 1 — <thème>
  F3 → F4 → …

Release 2 — <thème>
  F5 → F6
```

## Dépendances

```
Q → lots : Q… → F… · Q… → F…
lot → lot : F1 → F2 → F3
```

## Transverse déjà existant à préserver

Pas de lot dédié : <liste des zones transverses>.

**Exception à compléter** : <si applicable>.
