# Écrire une entrée de la référence des utilitaires

> Tenu par workflow-kit (core/meta/ecrire-un-utilitaire.md). Dans un projet, ce fichier est une **copie** que la synchronisation du kit écrase : ne pas le modifier là. C'est le seul endroit qui définit le format de `.agents/reference-utilitaires.md` : ce qui s'y référence, le gabarit d'une entrée, la lecture, les contrôles. **Qui écrit, et quand** : le Build, sur accord de l'utilisateur (pause 5 du workflow, ou commit d'un changement fait hors du workflow).

## À quoi sert la référence

Avant d'écrire une méthode, un agent y cherche si l'équivalent existe déjà, et ce qu'il ne doit jamais réécrire ailleurs. Elle dit **ce qui est vrai aujourd'hui** dans le code : ni l'histoire du code, ni les règles métier.

## Quand référencer

Une méthode, une classe ou un composant :
- **réutilisable** ailleurs que là où il est né ;
- ou **source unique** d'une règle qu'aucun autre code ne doit réécrire (un filtre, un calcul, le seul chemin d'une écriture) ;
- ou **piégeux** : nom trompeur, comportement contre-intuitif, effet de bord.

Une méthode privée n'y entre que si elle est la source unique d'une règle.

## Ce qui n'y va pas

| Contenu | Où il vit |
|---|---|
| Règle de comportement, de flux ou de calcul (métier) | `.agents/specs/spec-parallele.md` : l'entrée la cite par son `SP-…` |
| Définition d'un terme, d'une entité, d'un statut | `.agents/domain-glossary.md` |
| Historique (date, accord, feature qui a modifié l'entrée, ancienne version) | git, le fichier de feature clos, son registre des décisions |
| Numéro de ligne (`l.12`, `fichier:12`) | nulle part : il devient faux au premier changement du code, le nom de la méthode suffit |
| Détail d'implémentation (requête, boucle, ordre des appels) | le code |
| Convention d'écriture du code | le fichier-rôle concerné (`.agents/conventions.md`…) |

## Gabarit d'une entrée

```markdown
### `<Nom>`
- **Fichier** : `<chemin/du/fichier>`
- **Type** : <facultatif : action, service, modèle, composant…>
- **Rôle** : <une phrase : ce que fait l'entrée, quand s'en servir>
- **Méthodes** :
  - `<methode>(<paramètres>): <retour>` : <ce qu'elle fait, en une phrase>
- **Ne pas réécrire** : <la règle dont l'entrée est la source unique>
- **Piège** : <ce qui casse si on l'utilise mal>
- **Utilisé par** : `<Appelant>`, `<Appelant>`
- **Référence** : `SP-…` · feature `<dossier/slug>`
```

- **Titre** : le nom tel qu'il s'écrit dans le code, entre backticks. Quand une même classe a plusieurs entrées, un qualificatif entre parenthèses les distingue : `` ### `<Nom>` (scopes de requête) ``.
- **Obligatoires** : `Fichier` (ou `Fichiers`, plusieurs chemins séparés par des virgules) et `Rôle`. Les autres lignes ne s'écrivent que si elles ont un contenu.
- **Méthodes** : le nom **déclaré** dans le code, une puce par méthode, signature typée. Un membre qui n'est pas une méthode (propriété, constante, cas d'énumération) s'écrit sans parenthèses. Hors de cette liste, `` `<Nom>::<methode>()` `` ne cite qu'une méthode déclarée, jamais une méthode héritée du framework.
- **Ne pas réécrire** et **Piège** : les deux lignes que la référence existe pour porter. Ne jamais les perdre en raccourcissant une entrée.
- **Utilisé par** : les appelants principaux, pas l'inventaire complet.
- **Référence** : la règle `SP-…` qui fixe le comportement, et la feature d'origine (une seule, sans date).
- **Longueur** : 300 caractères au plus par ligne. Au-delà, l'entrée porte de l'implémentation ou une règle métier : la déplacer.

## Lire la référence

Jamais en entier, et sans index : une recherche donne déjà les numéros de ligne, toujours justes.
- **Avant de toucher une classe** : rechercher son titre (`` ### `<Nom>` ``), puis lire le seul bloc qui commence à cette ligne.
- **Avant d'écrire une méthode** : rechercher les mots du besoin (« prorata », « restant dû »…), puis lire les blocs trouvés. Les mots portés par `Rôle` et les noms de méthodes sont ceux que la recherche trouve : les écrire pour être trouvés.

## Déclarer le format

Le fichier déclare en tête qu'il suit ce format :

```markdown
> **Format** : `.agents/ecrire-un-utilitaire.md`
```

Sans cette ligne (fichier pas encore migré), les contrôles ne s'appliquent pas.

## Vérifier

Après toute écriture dans la référence, **et** après avoir renommé ou supprimé une méthode qu'elle cite :

```bash
node .agents/verifier-utilitaires.mjs
```

Node seul, sans le kit, toute techno. Le kit lance le même contrôle (`check-meta --utilitaires`, et le contrôle de livraison). Cinq vérifications :
1. chaque entrée a un titre entre backticks, sans doublon, et porte `Fichier` et `Rôle` ;
2. chaque fichier cité par `Fichier` existe, casse comprise ;
3. chaque méthode en tête d'une puce de `Méthodes` est déclarée dans un fichier de l'entrée ; chaque `` `<Nom>::<methode>()` `` cité, dont `<Nom>` est une entrée, est déclaré dans un de ses fichiers ;
4. chaque `SP-…` cité existe dans la spec parallèle ;
5. ni numéro de ligne, ni date, ni « accord utilisateur », et 300 caractères au plus par ligne.
