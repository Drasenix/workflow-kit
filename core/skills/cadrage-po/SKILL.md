---
name: "cadrage-po"
description: "Use when starting a new PO cadrage/chantier (consolidating specs for a subject, building a backlog, preparing a client meeting) or when the user asks to set up the SPECS/BACKLOG/FICHE-REUNION pattern. Also use to close a chantier (« /cloturer-chantier », « clôture le chantier [sujet] ») : decisions to the parallel spec, one LOT-* file per lot, then the three chantier files are deleted."
---

# cadrage-po

Patron **réutilisable** pour cadrer un sujet métier de bout en bout (travail de PO) **avant** de le découper en features exécutables. Agnostique du sujet : on instancie les templates avec `<domaine>` / `<sujet>`.

## Déclenchement

- « je commence [sujet] » en mode **cadrage** (pas une feature).
- « mets en place le chantier PO », « consolide les specs de [sujet] ».
- « nouvelle US/spec à cadrer », « prépare une réunion cliente sur [sujet] ».
- Demande d'initialiser le trio `SPECS` / `BACKLOG` / `FICHE-REUNION`.
- **Clôture** : `/cloturer-chantier <dossier>`, « clôture le chantier [sujet] », ou le raffineur qui la réclame au démarrage d'un lot (§ « Clôture du chantier »).

## Le patron

Un **dossier de chantier** : `<domaine>/<sujet>/`, contenant **3 fichiers** aux rôles distincts :

| Fichier | Rôle | Public |
|---|---|---|
| `SPECS.md` | Référentiel de specs consolidé | Cliente (échange) |
| `BACKLOG.md` | Roadmap des lots de dev | Dev |
| `FICHE-REUNION.md` | Support de réunion (brut) | Cliente (réunion) |

Le patron s'articule **en amont** du workflow (étapes 0→7 par feature). Les trois fichiers sont **temporaires** : ils servent à construire les décisions, puis la clôture répartit leur contenu à sa place définitive et les supprime. Tant qu'ils existent, ils ne font jamais foi face à la spec officielle et à la spec parallèle.

## Structures

Squelettes complets dans `templates/` (à copier à l'instanciation) :

### `SPECS.md` — 8 sections

| § | Section | Contenu |
|---|---|---|
| 1 | Contexte & définition métier | Ce qu'est le sujet, en clair |
| 2 | Sources consultées | Spec officielle (réf. + pages), spec parallèle, glossaire |
| 3 | Règles métier consolidées | Les règles du domaine, par sous-thème |
| 4 | User stories | `US-*`, réparties en thèmes |
| 5 | État de l'existant (code) | « Ce qui existe » / « Ce qui manque », réfs `fichier:ligne` |
| 6 | Décisions ouvertes (Q) | Cœur du dispositif (voir « Système de questions ») |
| 7 | Roadmap de développement | Simple pointeur vers `BACKLOG.md` |
| 8 | `SP-*` à ajouter | Registre (vide au départ), rempli après validation cliente |

### `BACKLOG.md`

- Intro : pointeur vers les specs + convention « 1 lot = 1 `.agents/feature/<slug>.md` ».
- Parcours : le cycle de vie du sujet, en étapes.
- Table « Lots par étape » : `Étape · Ordre · Lot · US · Q bloquantes · Dépend de · Nature`.
- Ordre d'exécution (releases) : Release 0 (tracer bullet) → 1 → 2 → …
- Dépendances : `Q → lots` et `lot → lot`.
- Transverse à préserver (+ exception(s)).

### `FICHE-REUNION.md`

- Une section par étape du cycle de vie.
- Pour chaque Q : rappel court + proposition/décision actuelle + champ `Réponse` vide.
- Section « Nouveaux sujets / manques soulevés ».
- Document **brut** (non mis à jour après réunion).

## Système de questions

Format standard d'une question :

```
- **Qx — [question]** `[TAG]`
  - *Source*        : passages de la spec (page, ligne, citation)
  - *Trou*          : ce qui est ambigu / manquant
  - *État des lieux*: contradiction spec ⚔️, ou écart spec ↔ code
  - *Décision*      : la règle retenue (quand tranchée)
  (+ *Exemple* / *Proposition* / *Écart spec* selon le cas)
```

**Regroupement** : un sommaire en tête de § 6 classe les Q par **étape du cycle de vie**, tout en gardant la liste dans l'ordre numérique.

**Cycle de vie d'une Q** : `[INCONNU]` → `[HYPOTHESE]` (proposition) → `[VALIDE]` (tranchée).

## Tags

| Tag | Signification |
|---|---|
| `[VALIDE]` | Décision tranchée |
| `[HYPOTHESE]` | Proposition en attente de validation cliente |
| `[INCONNU]` | Pas assez d'info pour trancher |

## Détection des Q & complétude

**Constat de base** : garantir l'**exhaustivité** de la liste des Q est **impossible** (exigences incomplètes par nature, inconnues inconnues). Le DoD ne peut donc pas être « on a toutes les Q » — il porte sur **la méthode** : « on a appliqué toutes les lentilles ».

### Lentilles de détection (par ordre de rendement)

- **A. Grille CRUD × entités** — pour chaque entité du domaine, balayer Créer / Lire / Modifier / Supprimer. Chaque case non spécifiée = Q potentielle. *(rendement élevé : révèle les suppressions/modifications oubliées)*
- **B. Marqueurs d'ambiguïté de la spec** — scanner « etc. », « selon », « sauf », « éventuellement », « configurable », « par défaut », « si … », « ou … ». Chaque marqueur = zone floue.
- **C. Diff spec ↔ code** — tout comportement du code non écrit dans la spec (et inversement) est une Q.
- **D. Analogie inter-domaines** — se demander, pour chaque règle d'un domaine voisin éprouvé, si elle s'applique ici.
- **E. Grille des frontières** — pour chaque action : 0 / négatif / maximum / vide / futur / passé / doublon / concurrent.
- **F. Test des GWT** — tenter d'écrire Given/When/Then pour chaque US ; **l'échec révèle la Q manquante** (juge de paix).
- **G. Revue croisée (3-amigos)** — un tiers relit et pose des questions naïves.

### DoD de la liste des Q (critères de complétude)

La liste est « Done » quand **toutes les lentilles ont été appliquées** :

1. **CRUD × entités** balayé — chaque case est une Q **ou** un « hors scope » explicite.
2. **Marqueurs d'ambiguïté** de la spec scannés.
3. **Diff spec ↔ code** fait (les 2 sens).
4. **Analogies** inter-domaines examinées.
5. **Frontières** passées en revue.
6. **Chaque US** a un GWT écrivable.
7. **Résiduels** listés (Q `[INCONNU]` + décisions de conception).

### Filet de sécurité

- **Ajout de Q à tout moment** (`Qn+`) : une Q ratée n'est pas perdue.
- **Re-balayage à l'étape 0-1 de chaque feature** : le raffineur remonte les edge cases du lot concerné.

### Répartition skill / chantier

- **Skill** (ici) : la **méthode** (lentilles A–G + DoD) — générique.
- **SPECS du chantier** : **l'instance** — la grille CRUD × entités *du domaine*, avec l'état (balayé / Q identifiée / hors scope).

## Flux

```
1. Cadrage PO            → SPECS (§3 règles, §4 US, §5 existant, §6 Q)
2. Réunion cliente       → FICHE-REUNION (réponses notées pendant la réunion)
3. Consignation          → SPECS §6 (tags + décisions) + §8 (SP-* préparés)
4. Clôture du chantier   → /cloturer-chantier, session Build, sur « go » :
                           Q [VALIDE] → spec parallèle (SP-*) · termes → glossaire
                           lots → .agents/feature/<domaine>/<sujet>/LOT-<nn>-<slug>.md
                           suppression de SPECS, BACKLOG, FICHE-REUNION
5. Exécution             → /raffiner <lot> : LOT-<nn>-<slug>.md renommé <nn>-<slug>.md, workflow 0→7
```

Lien avec le workflow : `SPECS` + `BACKLOG` = phase PO **amont**, qui se termine par la clôture ; `.agents/feature/<slug>.md` = unité exécutable (étapes 0→7) ; le raffineur (étapes 0-1) consomme spec officielle + parallèle + glossaire (via `@doc`), le code (via `@explorateur`) et le fichier du lot ; l'**étape 6** de chaque lot affine les `SP-*`. Le raffineur ne démarre aucun lot d'un chantier non clos (`workflow-kit/core/phase-raffinement.md` § « Création d'une feature »).

## Clôture du chantier

**Quand** : après la consignation des réponses de la réunion, avant le raffinement du premier lot. Des Q peuvent rester `[HYPOTHESE]` ou `[INCONNU]` : elles partent dans le lot qui en a besoin. Le raffineur réclame la clôture s'il est lancé sur un lot d'un chantier non clos ; l'utilisateur peut aussi la lancer quand il veut.

**Où** : session **Build** (écritures dans `.agents/specs/spec-parallele.md` et `.agents/domain-glossary.md`), par `/cloturer-chantier <dossier>`. Aucun contexte de la session de cadrage n'est nécessaire : `SPECS.md` porte l'état de chaque Q (tag).

**Chantier non clos** = son dossier contient encore `SPECS.md`. C'est le seul critère.

1. **Inventaire** — lire la section 6 de `SPECS.md` et `BACKLOG.md`. Présenter : les Q par tag ; pour chaque Q `[HYPOTHESE]` / `[INCONNU]`, le lot qui la reçoit (le premier lot de la table « Q → lots » qui en a besoin, un seul) ; la liste des fichiers `LOT-*` à créer. Vérifier avec l'utilisateur que les réponses de la fiche de réunion sont bien consignées en § 6. **Attendre le « go »**.
2. **Spec parallèle** — chaque Q `[VALIDE]` qui fixe une règle de comportement devient une entrée `SP-*` (à partir du registre, section 8 de `SPECS.md`, s'il est rempli) au format du fichier, statut `en vigueur (validé <date>)`, **Source** : `cadrage PO <sujet>, décision du <date>` (jamais un chemin vers les docs de chantier), **Gardé par** : le marqueur d'attente de la convention du projet (section « Statuts & types » de la spec parallèle) ; le lot qui la livre le complète (contrôlé à la livraison). Une Q `[VALIDE]` « hors périmètre » ou purement technique ne crée pas d'entrée : elle part dans le lot concerné. Puis `node workflow-kit/bin/workflow-kit.mjs check-meta --spec`.
3. **Glossaire** — les nouveaux termes du domaine vont dans `.agents/domain-glossary.md`.
4. **Fichiers de lot** — pour chaque ligne du BACKLOG, créer `LOT-<nn>-<slug>.md` dans le dossier du chantier, depuis `workflow-kit/core/templates/feature.md` (Progression intacte). `<nn>` = ordre d'exécution sur deux chiffres. En tête, sous `> Date`, la ligne `> Lot : <nn> — <intitulé> · dépend de : <nn>, <nn> (ou —)`. Sa section `## Périmètre du lot` **recopie** (texte, pas de renvoi) :
   - les US du lot ;
   - les décisions qui le concernent : identifiants `SP-*` créés en 2, et les décisions `[VALIDE]` sans `SP-*` (hors périmètre, choix techniques) en une phrase ;
   - le transverse à préserver du BACKLOG et les vigilances techniques utiles au lot (section 5 de `SPECS.md`) (`fichier:ligne`, à revérifier par `@explorateur`).

   Les Q ouvertes reçues par le lot vont dans `## Questions specs (étape 0)`, en cases `- [ ]` au format du gabarit (source dans la spec officielle + trou), **sans leur numéro Q** : il disparaît avec le chantier.
5. **Vérification** — aucune mention de `SPECS.md`, `BACKLOG.md`, `FICHE-REUNION.md`, ni d'un numéro Q du chantier, hors du dossier du chantier et hors des trois fichiers eux-mêmes (`grep -rn` sur `.agents/`). Toute mention trouvée est réécrite (texte recopié ou `SP-*`) avant de continuer. Puis `node workflow-kit/bin/workflow-kit.mjs check-meta --refs`.
6. **Suppression** — supprimer `SPECS.md`, `BACKLOG.md`, `FICHE-REUNION.md`, et proposer **un seul commit** (fichiers `LOT-*`, spec parallèle, glossaire, suppressions). L'historique git garde le chantier.

## Instanciation

1. Créer le dossier `<domaine>/<sujet>/`.
2. Copier les 3 templates depuis `templates/`.
3. Remplacer les variables :
   - `<Sujet>`, `<domaine>`, `<sujet>` ;
   - le **cycle de vie** (liste d'étapes métier) ;
   - les **US** (`US-1…`), les **Q** (`Q1…`), les **lots** (`F1…`).
4. Dérouler le flux (cadrage → réunion → consignation → clôture → lots).

## Garde-fous

- **Pas de `SP-*` sans « go » explicite** : le report dans la spec parallèle se fait à la clôture, sur « go » (même garde-fou que `.agents/reference-utilitaires.md`).
- **Rien ne cite le chantier** : aucun fichier hors du dossier du chantier ne renvoie à `SPECS.md`, `BACKLOG.md`, `FICHE-REUNION.md` ou à un numéro Q. Ce qui doit survivre est recopié ou porté par un `SP-*` (vérifié à l'étape 5 de la clôture).
- **Pas d'invention de règle métier** : en cas d'ambiguïté, `[INCONNU]` + question à la cliente — jamais de supposition.
- **`FICHE-REUNION.md` = document brut** : on ne le met pas à jour après la réunion ; la consignation se fait dans `SPECS §6`.
- **Pas de référence à un chantier vivant** : le patron est auto-portant (templates) ; ne pas lier un chantier particulier comme « exemple » (il dériverait).
- **Docs de chantier non auto-lus** : `SPECS.md`, `BACKLOG.md`, `FICHE-REUNION.md` ne sont **jamais préchargés** par le workflow (cf. skill `consult-workflow`) — lus uniquement sur demande explicite.
