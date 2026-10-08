# <Projet> : Specs fonctionnelles (index)

> **Source de lecture** : le fichier texte de specs (`spec.txt`), extraction du document source.
>
> **Ne jamais lire le PDF source directement** : la lecture échoue fréquemment. Toujours passer par le `.txt`.
>
> Cet index n'est PAS chargé automatiquement dans le contexte. Il sert à trouver quelle section lire, puis à déclencher une **lecture ciblée** (offset/limit). **Ne jamais dumper le `.txt` entier.**

## Comment lire le fichier de specs

Les numéros de page du document original apparaissent comme **lignes isolées** dans le `.txt`. Une page ≈ <N> lignes.

```
# 1. Trouver la ligne de départ (ancre de page)
grep -n "^ *51 *$" .agents/specs/spec.txt

# 2. Lire à partir de cette ligne
Read(file_path=".agents/specs/spec.txt", offset=<ligne>, limit=<N x pages>)

# Alternative : grep par mot-clé, puis lecture autour du match
Grep(pattern="<mot-clé métier>", path=".agents/specs/spec.txt")
```

## Table des matières (mappée aux pages)

> Remplir avec la structure réelle : parties, sections, pages.

### I. <Partie 1> : p. X-Y
- **<Section>** p. X : <résumé>

## Quick lookup : par concept métier

| Concept | Sections à lire |
|---|---|
| <Concept> | <Partie.Section> (p. X) |

## Quick lookup : spec parallèle (`SP-*`)

| Concept | Entrées |
|---|---|
| <Concept> | `SP-XXX-01..05` |

## Workflow conseillé pour agent IA

0. **Spec parallèle d'abord** : lire l'index de `.agents/specs/spec-parallele.md` et les `SP-*` liés au sujet (priment sur la page officielle).
1. **Question métier** → chercher le concept dans la table ci-dessus.
2. **Lire uniquement les passages indiqués** (ancre de page ou grep → lecture ciblée).
3. **Nuance validée** → définition d'entité : proposer `.agents/domain-glossary.md` ; règle de flux/calcul : proposer un `SP-*` (écriture Build après accord, recette étape 6).
4. **Ne jamais** résumer tout un chapitre « au cas où ».
