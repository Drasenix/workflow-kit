# <Sujet> — référentiel de specs

> **Dossier de consolidation métier.** Ce n'est PAS une feature exécutable (pas de Progression / TDD).
> La roadmap de dev vit dans `BACKLOG.md` (même dossier) — voir § 7.
>
> Date : <date>
> Sources : spec officielle (`.agents/specs/spec.txt`) + spec parallèle (`SP-*`) + glossaire + exploration du code.

---

## 1. Contexte & définition métier

<Définir le sujet en clair : ce qu'il est, à quoi il sert, ses cas d'usage.>

---

## 2. Sources consultées

### Spec officielle (`.agents/specs/spec.txt`)

| Réf. | Page | Contenu |
|---|---|---|
| <réf> | <p.> | <résumé> |

### Spec parallèle (`.agents/specs/spec-parallele.md`)

<Entrées `SP-*` liées, ou « aucune » + note.>

### Termes glossaire (`.agents/domain-glossary.md`)

<Termes concernés.>

---

## 3. Règles métier consolidées

> ⚠️ Mentionner les contradictions → voir § 6 (Q).

### 3.1 <sous-thème>
- <règle>

### 3.2 <sous-thème>
- <règle>

---

## 4. User stories

### Acteurs
- <acteur> — <rôle>

### Thème A — <thème>
- **US-1** — En tant que <acteur>, je veux <action> afin de <bénéfice>.
- **US-2** — …

### Thème B — <thème>
- **US-3** — …

---

## 5. État de l'existant (code)

> Issu de l'exploration du code — distingue **déjà implémenté** et **reste à construire**.

### Ce qui existe
- <élément> — `<fichier:ligne>`

### Ce qui manque
1. <élément>
2. <élément>

---

## 6. Décisions ouvertes (Q)

> Contradictions internes à la spec. **À trancher avant les scénarios GWT.**
>
> **Légende** : `[VALIDE]` = tranché · `[HYPOTHESE]` = proposition en attente de validation · `[INCONNU]` = pas assez d'info pour trancher.

**Sommaire par étape du cycle de vie** *(les Q restent listées dans l'ordre ci-dessous)* :

| Étape | Questions |
|---|---|
| **<étape 1>** | Q… |
| **<étape 2>** | Q… |

- **Q1 — <question>** `[INCONNU]`
  - *Source* : <passages (page, ligne, citation)>
  - *Trou* : <ambiguïté>
  - *État des lieux* : <contradiction spec / écart code>
  - *Décision* : <règle retenue, quand tranchée>

---

## 7. Roadmap de développement

> La roadmap ordonnée des lots vit dans **`BACKLOG.md`** (même dossier).
> Ce document est le **référentiel de specs** (échange cliente) : contexte, règles, US, existant, décisions.

---

## 8. `SP-*` à ajouter (registre)

> Les règles validées qui **amendent / précisent** la spec officielle seront reportées dans
> `.agents/specs/spec-parallele.md` **en une seule passe**, **après la réunion cliente**.
>
> **À remplir après validation cliente** : les Q `[HYPOTHESE]` et `[INCONNU]` doivent d'abord être tranchées.

| `SP-*` | Type (`AMENDE`/`PRECISE`/`ETEND`) | Ancre officielle | Règle | Supersession |
|---|---|---|---|---|
| — | — | — | *(à remplir)* | — |
