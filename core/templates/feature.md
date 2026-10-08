# <Nom de la feature>

> Date : YYYY-MM-DD
> Taille : Standard | S *(validée par l'utilisateur — critères : `.opencode/agent-workflow.md`)*

## Résumé métier

> Rempli par l'agent Build après le test global ✅. Explique en langage non technique :
> ce qui s'est passé, ce qui a été corrigé, en quoi ça protège, et si ça casse quelque chose.
> Destiné à un public métier (pas de jargon technique interne).

---

## Progression

| # | Étape | Agent | Statut | Date |
|---|-------|-------|--------|------|
| 0 | Consulter les specs | `@specs` | ⬜ | — |
| 1 | GWT | `@specs` | ⬜ | — |
| 2 | Test ROUGE | `@test` | ⬜ | — |
| 3 | Architecture | `@architect` | ⬜ | — |
| 4 | Développement VERT | `@dev` | ⬜ | — |
| 5 | Revue qualité | `@review` | ⬜ | — |
| 6 | Résumé métier + recette nuances | Build | ⬜ | — |
| 7 | Passage DONE | Build | ⬜ | — |

## Specs consultées (étape 0)

- **Page(s)/sections de spec** (via `.agents/specs/spec.txt`) : 
- **Spec parallèle (`SP-*`)** (`.agents/specs/spec-parallele.md`) : 
- **Termes glossaire** : 

---

## Questions specs (étape 0)

> Rempli par @specs. Questions **bloquantes** uniquement (trou réel) — source + trou obligatoires.
> Porter `Aucune` si la spec est claire.

- [ ] 

---

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

> Rempli par @specs. Un edge case se dérive d'une règle existante (spec, `SP-*`) et cite sa règle source.
> Porter `Aucun` si aucun edge case n'est dérivable.

| # | Edge case | GWT associé | Statut |
|---|---|---|---|
| EC-1 | | | ✅ couvert / ❌ non couvert (justification) |

---

## Ambiguïtés à valider

- [ ] 

---

## Conventions (fichiers-rôles)

> Rempli par le Build. Toute feature qui **établit ou modifie une convention** met à jour le **fichier-rôle** correspondant (`.agents/conventions.md`, `architecture.md`, `stack.md`, `commands.md`, `test-rules.md`, `ui-rules.md`, `component-rules.md`, `templates-index.md`) — et garde ses **références valides**.
> Porter `Aucune` si la feature ne touche à aucune convention.

| Fichier-rôle | Action | Statut |
|---|---|---|
| | créé / mis à jour | ⬜ |

---

## Architecture (étape 3)

> Rempli par @architect

### Challenge GWT / edge cases

> Constats justifiés (GWT/EC visé + règle source + trou). Porter `Aucun` si rien à signaler.

| # | Scénario / EC | Constat | Statut | Proposition |
|---|---------------|---------|--------|-------------|
| | | | ✅ conforme / ❌ écart | |

### Fichiers à créer / modifier

| Fichier | Type | Rôle |
|---------|------|------|
| | | |

### Code existant réutilisé

| Utilitaire | Fichier | Utilisation |
|------------|---------|-------------|
| | | |

### Contrat d'implémentation

> 🔴 **À respecter strictement par @dev à l'étape 4.** Toute déviation sera relevée par @review.

| Méthode | Signature attendue | Rôle | Appels obligatoires |
|---------|-------------------|------|---------------------|
| | | | |

### Patterns retenus

- 

### Questions à l'utilisateur

- 

### Nouveaux utilitaires à référencer

- 

---

## Décisions & Justifications — ADR (étape 3)

> Rempli par l'agent Build

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

### Problèmes détectés

- 

### Plan de refacto

> 🔵 Optionnel — rempli par @review. Déclenché par l'utilisateur via "go refacto".

| Fichier | Ligne(s) | Action | Justification |
|---------|----------|--------|---------------|
| | | | |

### Nouveaux utilitaires à référencer

- 

### Questions à l'utilisateur

- 

---

## Nuances consignées (étape 6)

> Règle : toute **règle métier validée et durable** hors spec officiel est consignée en `SP-*` dans `.agents/specs/spec-parallele.md` (écriture Build, après validation utilisateur — recette fusionnée avec le résumé métier).
> Porter `Aucune` si la feature n'introduit ni n'amende aucune règle.

| `SP-*` | Type | Ancre officielle | Statut |
|--------|------|------------------|--------|
| | AMENDE / PRECISE / ETEND | | ✅ en vigueur / ⛔ caduc |
