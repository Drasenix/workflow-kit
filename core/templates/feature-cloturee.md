# <Nom de la feature>

> Squelette cible d'un fichier de feature **clos et compacté** (skill `compacter-feature`).
> Trois variantes ci-dessous : `DONE-*`, `ABANDON-*`, `IRREPRODUCTIBLE-*`. Une section vide est **omise**.
> Les sections marquées « intacte » sont **recopiées à l'identique par le script** (`workflow-kit compact <fichier>`) ; l'agent ne rédige que les autres.

---

## Variante DONE

# <Nom de la feature>

> Date : YYYY-MM-DD
> Taille : Standard | S
> Lot : <lot, chantier, dépendances> *(si la feature découle d'un lot)*
> Périmètre : <périmètre> *(si présent)*
> Clôturé le YYYY-MM-DD · test global <N> verts · version de travail : `git show <hash>:<chemin du fichier>`

## Résumé métier

<intacte>

## Registre des décisions

> Seulement les décisions qui ne sont portées ni par un ADR, ni par le périmètre, ni par un scénario, ou dont l'identifiant est cité ailleurs (spec parallèle, backlog, autres features). Souvent vide : section omise.

| ID | Décision | Date | → Consigné dans |
|---|---|---|---|
| <Q1 / A2 / Q-A4 / Q1 revue…> | <décision en une phrase> | YYYY-MM-DD | <ADR-n · `SP-*` · lot destinataire · —> |

## Scénarios baseline — comportement actuel

> Déjà couverts ailleurs (texte complet : version de travail) : <B1 — titre> · <B2 — titre>.

<intacte : scénarios GWT et leurs lignes « Source » ; sans les blocs d'introduction de pilotage>

## Scénarios évolution — nouveau comportement

<intacte : idem>

## Dette connue

> Edge cases non couverts et hors-périmètre, avec le lot ou la feature qui les reprend.

| # | Edge case / sujet | Repris par | Justification |
|---|---|---|---|
| EC-n | | <lot / feature / —> | |

Couverts : EC-… (voir scénarios).

## Arbre de flux

<intacte, quel que soit son titre d'origine (« Arbre d'exécution », « Arbre de flux… »)>

## Décisions & Justifications — ADR

<intacte>

## Leçons de réalisation

> Ce qui a mal tourné pendant la réalisation et comment on l'a corrigé (refacto appliqué, backtrack, jalon ou test global en échec).

- <constat> → <correction> → <règle retenue> *(consignée dans <fichier-rôle / ADR-n / ici seulement>)*

## Vigilances

> Seulement ce qu'un agent futur risque de casser ou de rejouer, et que ni le code, ni un test, ni un ADR, ni un fichier-rôle ne protège.

- <vigilance> *(pour <lot / feature / agent>)*

## Traçabilité

- **Spec et US** : <sections de spec consultées, US du backlog>
- **Spec parallèle** : `SP-…` (<type>), … *(texte : `.agents/specs/spec-parallele.md`)*
- **Conventions établies** : <fichier-rôle> (<règle>), …
- **Utilitaires référencés** : <noms> *(détail : `.agents/reference-utilitaires.md`)*

## Recette manuelle

<intacte, si présente>

---

## Variante ABANDON

# <Nom de la feature>

> Date : YYYY-MM-DD
> Lot / Périmètre : <si présents>
> Abandonné le YYYY-MM-DD · version de travail : `git show <hash>:<chemin du fichier>`

## Raison de l'abandon

- **Date** : YYYY-MM-DD · **Décidé par** : <qui>
- **Cause** : <hors scope, annulation, blocage…>
- **Code produit** : <aucun · annulé · conservé (`<hash>`)>

## Ce qui a été tenté

<résumé court : étapes atteintes, approche>

## Registre des décisions

<même format que DONE>

## Questions restées ouvertes

<texte intégral, avec source + trou : réutilisable si le sujet revient (cadrage PO)>

## Scénarios (titres)

- <B1 — titre> · <E1 — titre> …

## Décisions & Justifications — ADR

<intacte, si présente>

---

## Variante IRREPRODUCTIBLE

# <Nom de la feature>

> Date : YYYY-MM-DD
> Clôturé irreproductible le YYYY-MM-DD · version de travail : `git show <hash>:<chemin du fichier>`

## Symptôme signalé

- **Source** : <ticket, signalement> · **Date du symptôme** : YYYY-MM-DD · **Environnement** : <…>
- **Description** : <ce qui a été observé>

## Hypothèses testées et éliminées

| Hypothèse | Test mené | Preuve d'élimination |
|---|---|---|
| | | |

## Données et journaux examinés

- <données, période, journaux>

## Conditions de réouverture

- <signal ou information qui justifierait de reprendre l'investigation>
