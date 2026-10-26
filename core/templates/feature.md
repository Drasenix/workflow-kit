# <Nom de la feature>

> Date : YYYY-MM-DD

## Résumé métier

> Rempli par l'agent Build après le test global ✅. Explique en langage non technique :
> ce qui s'est passé, ce qui a été corrigé, en quoi ça protège, et si ça casse quelque chose.
> Destiné à un public métier (pas de jargon technique interne).

---

## Progression

| # | Étape | Agent | Statut | Date |
|---|-------|-------|--------|------|
| 0 | Compréhension (specs + code) | raffineur | ⬜ | — |
| 1 | GWT + challenge | raffineur | ⬜ | — |
| 2 | Test ROUGE | `@test` | ⬜ | — |
| 3 | Plan | `@dev` | ⬜ | — |
| 4 | Développement VERT | `@dev` | ⬜ | — |
| 5 | Revue qualité | `@review` | ⬜ | — |
| 6 | Résumé métier + recette nuances | Build | ⬜ | — |
| 7 | Passage DONE | Build | ⬜ | — |

## Registre des décisions

> Tenu par l'agent principal (raffineur aux étapes 0-1, Build ensuite), **avant d'agir** : une ligne par parole de l'utilisateur qui change le cours (réponse à une pause, correction en cours d'étape, « go refacto », retour à une étape, accord ou refus d'une mise à jour meta). Le texte des questions reste dans leur section ; seule la décision vient ici. La colonne « Consigné dans » se complète au plus tard à l'étape 6. Repris tel quel à la compaction.

| ID | Décision | Date | → Consigné dans |
|---|---|---|---|
| | | | |

## Specs consultées (étape 0)

> Rempli par le raffineur à partir des références rendues par `@doc` : des références, pas de contenu recopié.

- **Page(s)/sections de spec** (via `.agents/specs/spec.txt`) : 
- **Spec parallèle (`SP-*`)** (`.agents/specs/spec-parallele.md`) : 
- **Termes glossaire** : 
- **Sources externes** (URL, date, ce qu'elles établissent) : 

---

## Questions specs (étape 0)

> Rempli par le raffineur. Questions **bloquantes** uniquement (trou réel, spec ou code) — source + trou obligatoires.
> Porter `Aucune` si la spec et le code sont clairs.

- [ ] 

---

## Contexte technique (étape 0)

> Rempli par le raffineur à partir des faits de `@explorateur` utiles à la réalisation, chacun avec son `fichier:ligne` : point d'entrée existant, tests existants touchés, contraintes techniques. Lu par `@test` et `@dev`. Porter `Aucun` si rien d'utile.

- **Point d'entrée** : 
- **Tests existants touchés** : 
- **Contraintes techniques** : 

---

## Clé de lecture des scénarios (étape 1)

> Rempli par le raffineur **si les scénarios en ont besoin** : vocabulaire des GIVEN / WHEN / THEN (« consulter l'écran X » = quelle requête), jeu de données commun, ce qui n'est volontairement pas écrit. Les scénarios y renvoient au lieu de le répéter. Repris tel quel à la compaction. Porter `Aucune` si les scénarios se lisent seuls.

## Scénarios baseline — comportement actuel (étape 1)

> Tests qui figent l'existant avant modification. Servent de filet de sécurité.

### Scénario B1 — 

GIVEN 
WHEN  
THEN  

### Scénario B2 — 

GIVEN 
WHEN  
THEN  

---

## Scénarios évolution — nouveau comportement (étape 1)

> Tests du comportement futur attendu.

### Scénario E1 — Nominal

GIVEN 
WHEN  
THEN  

### Scénario E2 — Erreur

GIVEN 
WHEN  
THEN  

### Scénario E3 — Cas limite

GIVEN 
WHEN  
THEN  

---

## Edge cases identifiés (étape 1)

> Rempli par le raffineur. Un edge case se dérive d'une règle existante (spec, `SP-*`) ou d'une contrainte du `## Contexte technique`, et cite sa source.
> Porter `Aucun` si aucun edge case n'est dérivable.

| # | Edge case | GWT associé | Statut |
|---|---|---|---|
| EC-1 | | | ✅ couvert / ❌ non couvert (justification) |

---

## Ambiguïtés à valider

- [ ] 

---

## Arbitrages du challenge (étape 1)

> Rempli par le raffineur après le passage de `@challenger` : une ligne par écart rapporté, avec l'arbitrage de l'utilisateur et l'endroit où il est répercuté (EC, scénario, Registre). Porter `Aucun écart` si le challenger n'en a rapporté aucun.

| # | Cible | Écart | Arbitrage | Répercuté dans |
|---|---|---|---|---|
| | | | | |

---

## Conventions (fichiers-rôles)

> Rempli par le Build, à chaque décision : **toute mise à jour d'un fichier meta** décidée pendant la feature — fichiers-rôles (`.agents/conventions.md`, `architecture.md`, `stack.md`, `commands.md`, `test-rules.md`, `ui-rules.md`, `component-rules.md`, `templates-index.md`), `reference-utilitaires.md`, `domain-glossary.md`, références mortes à corriger. Ligne ⬜ à la décision, ✅ une fois écrite (au plus tard à l'étape 6). Le contrôle de livraison refuse une ligne ⬜.
> Porter `Aucune` si la feature ne touche à aucun fichier meta.

| Fichier-rôle | Action | Statut |
|---|---|---|
| | créé / mis à jour | ⬜ |

---

## Plan (étape 3)

> Rempli par @dev à l'étape 3, validé par l'utilisateur à la pause 3 ; `### Écarts au plan` complété à l'étape 4. Dit **ce qui va être fait**, pas comment chaque ligne sera écrite.

### Arbre de flux

> L'arbre indenté présenté à la pause (point d'entrée → … → rendu), annoté des identifiants de scénarios. Repris tel quel à la compaction. Porter `Aucun` si la feature n'a pas de point d'entrée.

### Fichiers à créer / modifier

| Fichier | Type | Rôle |
|---------|------|------|
| | | |

### Code existant réutilisé

| Utilitaire | Fichier | Utilisation |
|------------|---------|-------------|
| | | |

### Choix structurants

> Seulement quand il existait une vraie alternative. Chaque choix validé à la pause 3 devient un ADR. Porter `Aucun` sinon.

- 

### Signatures publiques

> Points d'entrée et méthodes appelées d'ailleurs, typées. Rien de privé, aucune contrainte de rendu.

| Méthode | Signature | Rôle |
|---------|-----------|------|
| | | |

### Questions à l'utilisateur

- 

### Nouveaux utilitaires à référencer

> Puces de @dev (étapes 3, 4 et refacto) et de @review. Tranchées à la pause 5 par le récapitulatif `### Décisions techniques` : `→ ✅ référencé` ou `→ ⛔ <raison>`.

- 

### Écarts au plan

> Rempli par @dev à l'étape 4 : écarts **mineurs** (quoi, pourquoi). Un écart majeur arrête @dev et passe par l'utilisateur. Porter `Aucun` si le code suit le plan.

- 

---

## Décisions & Justifications — ADR (étape 3)

> Rempli par l'agent Build, à partir des choix structurants validés à la pause 3

### ADR-1 — 

- **Choix** : 
- **Alternatives envisagées** : 
- **Raison** : 
- **Date** : 

---

## Revue qualité (étape 5)

> Rempli par @review

### Checklist

| # | Point | Statut |
|---|-------|--------|
| | | ✅ / ❌ |

### Edge cases métier

> Chaque edge case confronté au code (`Aucun` si la section des edge cases porte `Aucun`).

| # | Edge case | Comportement observé | Conforme au GWT ? |
|---|---|---|---|
| | | | ✅ / ❌ |

### Verdict et vérifications exécutées

> Verdict, tests relancés, sondes. Trace de revue : retirée à la compaction (ce qui a mal tourné va dans « Problèmes détectés »).

- 

### Problèmes détectés

- 

### Plan de refacto

> 🔵 Optionnel — rempli par @review. Déclenché par l'utilisateur via "go refacto".

| Fichier | Ligne(s) | Action | Justification |
|---------|----------|--------|---------------|
| | | | |

### Nouveaux utilitaires à référencer

> Tranchées à la pause 5 par le récapitulatif `### Décisions techniques` : `→ ✅ référencé` ou `→ ⛔ <raison>`.

- 

### Décisions techniques

> Rempli par @review : une ligne par décision d'équipe (utilitaires de toutes les étapes, fichiers-rôles, références mortes), avec la décision proposée. Présenté à la pause 5 : ce que l'utilisateur ne conteste pas est accepté. Porter `Aucune` s'il n'y a rien à décider.

| # | Objet | Décision proposée | Raison |
|---|---|---|---|
| | | | |

### Questions à l'utilisateur

> Questions **métier** (`[À CONSIGNER]`, `[AMENDE SP-*]`) et points bloquants, arbitrés un à un.

- 

---

## Nuances consignées (étape 6)

> Règle : toute **règle métier validée et durable** hors spec officiel est consignée en `SP-*` dans `.agents/specs/spec-parallele.md` (écriture Build, après validation utilisateur — recette fusionnée avec le résumé métier).
> Porter `Aucune` si la feature n'introduit ni n'amende aucune règle.

| `SP-*` | Type | Ancre officielle | Statut |
|--------|------|------------------|--------|
| | AMENDE / PRECISE / ETEND | | ✅ en vigueur / ⛔ caduc |
