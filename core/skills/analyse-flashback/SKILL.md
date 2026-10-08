---
name: "analyse-flashback"
description: "Analyse le code à une date donnée via les tags prod, pour diagnostiquer des tickets antidatés"
---

# analyse-flashback

Utiliser cette skill quand l'utilisateur décrit un comportement qui s'est produit à une date antérieure et qu'il faut comprendre le code tel qu'il était à cette date pour diagnostiquer un problème.

Exemple typique : une facture qui n'est pas passée au mois d'août alors qu'on est en octobre.

## Garde-fous

1. **Ne jamais modifier l'état de travail** : pas de checkout, pas de création de branche. Lecture seule via `git show`.
2. **Vérifier que la date n'est pas dans le futur** : si la date fournie est postérieure au dernier tag, alerter l'utilisateur.
3. **Vérifier qu'il existe des tags** : si aucun tag de production n'existe, alerter l'utilisateur.

## Workflow

### Étape 1 : déterminer la date cible

Extraire la date du ticket ou de la demande utilisateur :
- Si une date précise est donnée (ex: "15 août 2026"), la telle quelle.
- Si un seul mois est donné (ex: "août 2026"), prendre le dernier jour du mois (ex: 31 août 2026).
- Si la date est floue, demander confirmation à l'utilisateur.

### Étape 2 : trouver le tag correspondant

Lister les tags et trouver le plus récent **antérieur ou égal** à la date cible :

```bash
git tag --sort=-creatordate
```

Les tags de production suivent une convention de nommage datée propre au projet (ex. `prod-DD-MM-YYYY`). Sélectionner le tag dont la date est la plus proche mais **≤ date cible**.

Si aucun tag n'existe avant cette date, utiliser le plus ancien disponible.

### Étape 3 : lire le code depuis le tag

Lister les fichiers existants à cette date :

```bash
git ls-tree -r --name-only <tag>
```

Lire un fichier sans checkout :

```bash
git show <tag>:<path>
```

Identifier les fichiers pertinents pour le domaine concerné.

### Étape 4 : comprendre le code à cette date

Analyser la logique métier telle qu'elle existait :
- Lire les fichiers concernés.
- Comprendre le flux métier et les règles de gestion en vigueur.
- Noter les différences potentielles avec le comportement attendu.

### Étape 5 : comparer avec le code actuel

Identifier les changements intervenus depuis le tag :

```bash
git diff <tag>..HEAD -- <path>
git log <tag>..HEAD --oneline -- <path>
```

Se concentrer sur les fichiers pertinents pour le domaine du ticket.

### Étape 6 : produire le diagnostic

Rédiger un rapport structuré (format ci-dessous).

## Format du diagnostic

```markdown
## Diagnostic flashback : <date>

### Contexte
<description du problème observé>

### Code à cette date (<tag>)
<résumé du comportement du code à cette date, avec les fichiers clés>

### Changements depuis
<liste des modifications pertinentes intervenues entre le tag et HEAD>

### Hypothèse
<explication probable du comportement observé, basée sur la comparaison>
```

## Rappel : commandes git

```bash
git tag --sort=-creatordate                          # lister les tags
git show <tag>:<path>                                # lire un fichier depuis un tag
git ls-tree -r --name-only <tag>                     # lister les fichiers à une date
git diff <tag>..HEAD -- <path>                       # comparer un fichier
git log <tag>..HEAD --oneline -- <path>              # historique d'un fichier
```
