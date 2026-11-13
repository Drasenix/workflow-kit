# Écrire une règle dans la spec parallèle

> Tenu par workflow-kit (`core/specs/ecrire-une-regle.md`). Dans un projet, ce fichier est une **copie** que la synchronisation du kit écrase : ne pas le modifier là. Il décrit le **format** d'une entrée de `.agents/specs/spec-parallele.md`. Le **moment** et la **validation** dépendent de qui écrit : dans le workflow, le Build à l'étape 6 (ou à la clôture d'un chantier), après validation de l'utilisateur ; hors du workflow, dans le commit du changement, en demandant à l'utilisateur au moindre doute métier.

## Quand écrire une entrée

Les quatre conditions à la fois :
1. une règle de **comportement, de flux ou de calcul** : ce que voit ou subit l'utilisateur, pas la façon dont le code est écrit ;
2. **validée** par l'utilisateur : une décision, pas une hypothèse ;
3. **durable** : elle vaudra pour les cas suivants, pas pour un cas ponctuel ;
4. **hors de la spec officielle**, ou qui la modifie.

Une règle existante que le changement contredit se met **toujours** à jour, même pour un libellé ou une couleur.

## Ce qui n'y va pas

- Définition d'un terme, d'une entité, d'un statut → `.agents/domain-glossary.md`. Un terme, un statut ou un libellé qui change : mettre **aussi** le glossaire à jour.
- Méthode de code réutilisable → `.agents/reference-utilitaires.md`.
- Détail d'implémentation, choix technique → le fichier de feature, ou le message de commit.

## Ajouter, remplacer, amender

- **Nouvelle règle** : prochain numéro libre de son domaine, `SP-<DOM>-<n>` (domaines listés en tête de la spec ; un nouveau domaine se demande). Une ligne dans l'index, une entrée dans « Entrées ».
- **Règle remplacée en entier** : la nouvelle entrée porte `Remplace : SP-…` ; l'ancienne passe `⛔ caduc (→ SP-…)` dans son entrée **et** dans l'index, et reçoit `Remplacé par : SP-… (date) — <ce qui change>`.
- **Règle modifiée en partie** : la nouvelle entrée porte `Amende : SP-… (<ce qui change>)` ; l'ancienne reste en vigueur et reçoit `Amendé par : SP-… (date) — <ce qui change>`.
- Le texte d'une règle existante ne se réécrit jamais : l'histoire reste lisible.

## Modèle

Ligne d'index : `| SP-<DOM>-<n> | ✅ en vigueur (AAAA-MM-JJ) | AMENDE, PRECISE ou ETEND | <ancre officielle> | <titre> |`

```markdown
### SP-<DOM>-<n> — <titre>

> **Statut** : ✅ en vigueur (validé AAAA-MM-JJ) · **Type** : AMENDE (remplace une règle officielle), PRECISE (la complète) ou ETEND (cas non couvert)
> **Amende** : SP-… (<ce qui change>)   ← ou Remplace / Précise / Étend ; ligne absente s'il n'y en a pas
> **Ancre officielle** : <section> (p. X) de la spec officielle, ou « — (spec muette) »
> **Source** : d'où vient la règle — fichier de feature, cadrage PO <sujet>, ticket, décision de l'utilisateur du AAAA-MM-JJ
> **Mots-clés** : <mots qu'un lecteur chercherait>
> **Gardé par** : selon la convention déclarée en tête de la spec (`Test::methode`, ou la feature) ; avant implémentation, son marqueur d'attente

**Règle.** <ce qui se passe, en langage métier : écrans, libellés, statuts, montants ; ni classe, ni méthode, ni colonne>

**Cas limites.** <si besoin, un par puce>

**Pourquoi.** <la raison métier si elle est connue ; sinon, le dire>
```

Champs de renvoi, toujours au masculin : `Amende` / `Amendé par`, `Précise` / `Précisé par`, `Remplace` / `Remplacé par`, `Étend` / `Étendu par`.

## Vérifier

`node .agents/specs/verifier-spec.mjs`, et le contrôle des tests cités s'il existe (`.agents/skills/tests/assets/`).
