# Écrire une entrée de la référence des utilitaires

> Tenu par workflow-kit (core/meta/ecrire-un-utilitaire.md). Dans un projet, ce fichier est une **copie** que la synchronisation du kit écrase : ne pas le modifier là. C'est le seul endroit qui définit le format de `.agents/reference-utilitaires.md` : ce qui s'y référence, le gabarit d'une entrée, le sommaire, la lecture, les contrôles. **Qui écrit, et quand** : le Build, sur accord de l'utilisateur (pause 5 du workflow, ou commit d'un changement fait hors du workflow).

## À quoi sert la référence

Avant d'écrire une méthode, un agent y cherche si l'équivalent existe déjà : il l'appelle au lieu de le réécrire. Elle dit **ce qui est vrai aujourd'hui** dans le code : ni l'histoire du code, ni les règles métier.

## Quand référencer

Une méthode, une classe ou un composant :
- **réutilisable** ailleurs que là où il est né ;
- ou **source unique** d'une règle qu'aucun autre code ne doit réécrire (un filtre, un calcul, le seul chemin d'une écriture) : son `Rôle` nomme cette règle.

Une méthode privée n'y entre que si elle est la source unique d'une règle. Un nom trompeur ne se signale pas ici : il se corrige, par un renommage.

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
- **Utilisé par** : `<Appelant>`, `<Appelant>`
- **Référence** : `SP-…` · feature `<dossier/slug>`
```

- **Format fermé** : ces six champs seulement, dans cet ordre, chacun une fois. Aucun autre champ, aucune ligne hors gabarit : le contrôle les refuse. Une contrainte d'usage (paramètre attendu, effet de bord) s'écrit dans la phrase de la méthode concernée.
- **Titre** : le nom tel qu'il s'écrit dans le code, entre backticks. Quand une même classe a plusieurs entrées, un qualificatif entre parenthèses les distingue : `` ### `<Nom>` (scopes de requête) ``.
- **Obligatoires** : `Fichier` (ou `Fichiers`, plusieurs chemins séparés par des virgules) et `Rôle`. Les autres lignes ne s'écrivent que si elles ont un contenu.
- **Rôle** : une phrase de 120 caractères au plus, avec les mots du besoin (« prorata », « restant dû »…) : c'est la ligne de l'entrée dans le sommaire, la seule qu'un agent lit avant de concevoir. Un agent reconnaît ce qu'il a sous les yeux, pas ce qu'il ne sait pas nommer. Pour une source unique, il nomme la règle portée.
- **Méthodes** : le nom **déclaré** dans le code, une puce par méthode, signature typée. Un membre qui n'est pas une méthode (propriété, constante, cas d'énumération) s'écrit sans parenthèses. Hors de cette liste, `` `<Nom>::<methode>()` `` ne cite qu'une méthode déclarée, jamais une méthode héritée du framework.
- **Utilisé par** : les appelants principaux, pas l'inventaire complet.
- **Référence** : la règle `SP-…` qui fixe le comportement, et la feature d'origine (une seule, sans date).
- **Longueur** : 300 caractères au plus par ligne. Au-delà, l'entrée porte de l'implémentation ou une règle métier : la déplacer.

## Sommaire

`.agents/reference-utilitaires-sommaire.md` : une ligne par entrée (son titre et son `Rôle`), groupées par domaine. Il est **généré**, jamais écrit à la main :

```bash
node .agents/verifier-utilitaires.mjs --sommaire
```

À relancer après toute écriture dans la référence. Le contrôle signale un sommaire absent ou pas à jour.

## Lire la référence

- **Avant de concevoir** (plan, étape 3) **ou de juger une duplication** (revue, étape 5) : lire le **sommaire en entier**. C'est la mémoire de ce qui existe : un agent ne trouve par recherche que ce qu'il sait déjà nommer, mais il reconnaît ce qu'il a sous les yeux.
- **Puis**, pour chaque utilitaire retenu : rechercher son titre dans la référence (`` ### `<Nom>` ``) et lire le seul bloc qui commence à cette ligne.
- **Avant de toucher une classe** : rechercher son titre dans la référence, même chose.
- **La référence ne se lit jamais en entier.**

## Déclarer le format

Le fichier déclare en tête qu'il suit ce format :

```markdown
> **Format** : `.agents/ecrire-un-utilitaire.md`
```

Sans cette ligne (fichier pas encore migré), les contrôles ne s'appliquent pas.

## Vérifier

Après toute écriture dans la référence, **et** après avoir renommé ou supprimé une méthode qu'elle cite :

```bash
node .agents/verifier-utilitaires.mjs --sommaire
```

Node seul, sans le kit, toute techno. Le kit lance le même contrôle (`check-meta --utilitaires`, et le contrôle de livraison). Sept vérifications :
1. chaque entrée a un titre entre backticks, sans doublon, et porte `Fichier` et `Rôle`, de 120 caractères au plus ;
2. chaque fichier cité par `Fichier` existe, casse comprise ;
3. chaque méthode en tête d'une puce de `Méthodes` est déclarée dans un fichier de l'entrée ; chaque `` `<Nom>::<methode>()` `` cité, dont `<Nom>` est une entrée, est déclaré dans un de ses fichiers ;
4. chaque `SP-…` cité existe dans la spec parallèle ;
5. ni numéro de ligne, ni date, ni « accord utilisateur », et 300 caractères au plus par ligne ;
6. le sommaire existe et correspond à la référence ;
7. format fermé : chaque entrée n'a que les champs du gabarit, une fois chacun, dans l'ordre, et aucune ligne hors gabarit (les séparateurs `---` sont admis).
