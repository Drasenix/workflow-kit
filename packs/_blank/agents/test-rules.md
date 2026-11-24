# Regles d'ecriture des tests (a completer)

> Squelette du pack `_blank`. La regle binaire generique (unitaire vs integration) vit dans `core/agents/test.md` ; decrire ici les details de la stack.

## Dossiers et classes de base

| Categorie | Dossier | Base class |
|---|---|---|
| Test unitaire | `<dossier de tests>/unit` | <base> |
| Test d'integration | `<dossier de tests>/integration` | <base> |

## Helpers interdits / obligatoires

- <regle>

## Config de test

- <config>

## Tests d'architecture

Une convention mecanisable devient un test de structure (ou s'ecrit une valeur, quelle couche appelle quoi).

- <dossier des tests d'architecture>, une ligne `Règle : <convention>` en tete de chaque test (le sommaire des regles en est genere).
- Les listes de litteraux interdits sont calculees par le test a partir de la source de verite du projet (table, enumerations, dossiers), jamais ecrites a la main.
- Exceptions (choix assumes, dans le test, avec leur raison) distinctes des tolerances (dette, `tolerances/<regle>.json`, qui ne font que baisser ; controle `check-meta --tolerances`).
