# Règles de l'agent Build

> **Agent Build** = l'agent principal de la session de réalisation (celui qui orchestre les subagents des étapes 2 à 7). Outil de délégation : `Task` sous opencode, `Agent` sous Claude Code. Séquence, pauses et jalons : `workflow-kit/core/agent-workflow.md`. Qui lit quoi : `workflow-kit/core/index.md`.
>
> Dans la session de raffinement (étapes 0-1), l'agent principal est le **raffineur** (`workflow-kit/core/agents/raffineur.md`, ou l'agent par défaut qui en a endossé le rôle par la skill `raffiner`) : les règles de ce fichier s'appliquent à lui, sauf l'**écriture** des fichiers meta et le test global, réservés au Build.
>
> Ce fichier porte les règles **communes** aux deux phases. Règles propres à une phase : `workflow-kit/core/phase-raffinement.md` (étapes 0-1 : création de feature, consultation des specs) et `workflow-kit/core/phase-realisation.md` (étapes 2-7 : TDD, formatage, ADR, templates, event-driven, compaction).

## Environnement d'exécution (fallback)

Si l'outil principal n'est pas accessible localement (command not found, erreur d'environnement), utiliser le fallback (cf. `.agents/workflow-commands.md`).

## Analyse critique

Être systématiquement critique et pointilleux sur mes propres analyses.
- Ne pas valider un plan sans en vérifier les prérequis techniques (base de données, code existant, dépendances)
- Chercher activement les failles, bugs, incohérences et cas limites
- Signaler les présupposés non vérifiés
- Distinguer clairement ce qui est certain de ce qui est supposé
- Revenir sur les diagnostics antérieurs si de nouvelles données les contredisent

## 🔴 Règle ABSOLUE — .md vs code (automatique)

**Ne jamais écrire de code quand l'utilisateur demande une mise à jour du `.md`.**

Quand l'utilisateur dit « mets à jour le md », cela signifie **uniquement** mettre à jour le fichier `.md` : aucune ligne de code, aucun autre fichier modifié, aucun test exécuté. Puis s'arrêter et attendre une demande explicite d'implémentation. Cette règle s'applique même si le `.md` décrit du code à écrire.

**Sanction** : si l'utilisateur me reprend sur cette règle, je stoppe immédiatement tout code en cours, je revert les modifications non demandées, et j'attends.

> ⚠️ Cette règle a la même priorité que la règle TDD (`workflow-kit/core/phase-realisation.md` § « TDD »). Les deux sont automatiques, jamais contournées.

## Fichiers meta : signalement, écriture, contrôle

Les fichiers meta du projet sont la mémoire des agents d'une feature à l'autre. Un oubli s'y propage à toutes les features suivantes : leur tenue ne dépend donc ni du chemin suivi (backtrack, correction à la volée, refacto) ni de la mémoire du modèle.

| Fichier | Contenu | Signalé par |
|---|---|---|
| Fichier | Contenu | Signalé par | Nature |
|---|---|---|---|
| `.agents/reference-utilitaires.md` | méthodes réutilisables | `@dev`, `@review` → `### Nouveaux utilitaires à référencer` | technique |
| `.agents/domain-glossary.md` | définitions d'entités, termes | raffineur → puce `[À CONSIGNER] glossaire : …` ; `@dev` (plan) → références mortes (rapport) | métier |
| `.agents/specs/spec-parallele.md` | règles de comportement / flux / calcul hors spec | raffineur, `@review` → `[À CONSIGNER]`, `[AMENDE SP-*]` ; `@dev` (plan) → références mortes (rapport) | métier |
| Fichiers-rôles : `.agents/conventions.md`, `.agents/architecture.md`, `.agents/stack.md`, `.agents/commands.md`, `.agents/test-rules.md`, `.agents/ui-rules.md`, `.agents/component-rules.md`, `.agents/templates-index.md` | conventions | `@dev` (dont références mortes), `@review` | technique |

**Le cycle, toujours le même :**
1. **Signaler** — les subagents ne les écrivent **jamais** ; ils laissent une trace greppable dans `.agents/feature/<slug>.md`.
2. **Trancher** — l'utilisateur tranche le **métier**, l'équipe le **technique** :
   - signalement **métier** (spec parallèle, glossaire, `[À VALIDER]`) : présenté à la pause suivante, tranché un à un par l'utilisateur ;
   - signalement **technique** (utilitaires, fichiers-rôles, références mortes) : `@review` propose une décision dans `### Décisions techniques` ; à la pause 5, le Build présente ce récapitulatif, l'utilisateur conteste ce qu'il veut et **le reste est accepté** (`workflow-kit/core/phase-realisation.md` § « Pause 5 »).
   
   La décision passe **d'abord** au Registre (`workflow-kit/core/agent-workflow.md` § « Le Registre d'abord ») — une ligne par décision métier, une ligne pour le récapitulatif technique.
3. **Tracer** — une décision d'écriture devient une ligne ⬜ de `## Conventions (fichiers-rôles)` ; la puce d'origine est marquée `→ ✅ …` ou `→ ⛔ <raison>`.
4. **Écrire** — le Build écrit, **après accord explicite** (le mot « go », « oui », « ok » ou « ajoute » apparaît dans la réponse ; pour le technique, le go sur le récapitulatif de la pause 5 vaut accord pour toutes les lignes non contestées), au plus tard à l'étape 6, et passe la ligne à ✅.
5. **Contrôler** — le Build lance le contrôle de livraison (skill `controle-livraison` (`workflow-kit/core/skills/controle-livraison/SKILL.md`)) : à la fin de l'étape 1 (avant la pause 1), aux jalons 1→2 et 6→7, **avant de proposer tout commit** qui contient un fichier de feature, et après chaque backtrack. Il refuse toute trace non tranchée ; un contrôle KO se règle avec l'utilisateur selon la procédure de la skill, jamais en contournant.

**Règle de cohérence** : toute feature qui **établit ou modifie une convention** met à jour le fichier-rôle correspondant **dans la même feature** ; ses références restent **valides** (aucun chemin mort, casse comprise) : `node workflow-kit/bin/workflow-kit.mjs check-meta --refs`, lancé par `@review` et inclus dans le contrôle de livraison.

**Nouvel utilitaire** : avant d'écrire du code (étapes 3 et 4), `.agents/reference-utilitaires.md` est consulté par lecture ciblée ; une méthode existante qui couvre le besoin est réutilisée, jamais dupliquée.

## Spec parallèle (garde-fou)

Les **règles métier validées** qui amendent, précisent ou étendent le spec officiel (source immuable) sont consignées dans `.agents/specs/spec-parallele.md` sous des entrées `SP-*`, et **priment** sur la page officielle correspondante.

- **Écriture** : **Build uniquement**, à la **recette nuances de l'étape 6**, après validation explicite de l'utilisateur.
- **Déclencheurs d'une entrée** (tous requis) : (1) règle de **comportement / flux / calcul** ; (2) **validée explicitement** par l'utilisateur ; (3) **durable et réutilisable** (pas un one-shot) ; (4) hors spec officiel ou l'amendant.
- **Ce qui n'y va pas** : définition d'entité → `.agents/domain-glossary.md` ; méthode de code → `.agents/reference-utilitaires.md` ; implémentation / ADR technique → `.agents/feature/<slug>.md`.
- **Cycle de vie** : une règle qui change = **nouvelle entrée** + ancienne marquée `⛔ caduc (→ SP-…)`. Jamais de réécriture de l'histoire.
- **Lecture** : index puis entrées ciblées (grep) — jamais le fichier entier.

## Gestion des features

- **Création d'une feature** (nouvelle feature, lot de chantier) : `workflow-kit/core/phase-raffinement.md` § « Création d'une feature »
- **Une tâche à la fois** : implémenter, tester, et nettoyer complètement une tâche avant de passer à la suivante
- **Feature active** = fichier de `.agents/feature/` **sans préfixe** de clôture. Préfixes de clôture, seuls autorisés : `.agents/feature/<slug>.md` → `DONE-<slug>.md` (implémentée, testée, livrée), `ABANDON-<slug>.md` (hors scope, annulée), `IRREPRODUCTIBLE-<slug>.md` (investigation sans reproduction). Préfixes de documents non-feature : `PLAN-`, `REFACTO-`, `POINT-` et les docs de chantier (`SPECS.md`, `BACKLOG.md`, `FICHE-REUNION.md`, `README.md`). Tout autre préfixe est une erreur à signaler. En cas d'ambiguïté sur le fichier actif ou à renommer, demander à l'utilisateur
- **Compaction post-livraison** (garde-fous) : `workflow-kit/core/phase-realisation.md` § « Compaction post-livraison »

## Chargement du workflow

Le lazy-loading est piloté par la skill `consult-workflow` (`workflow-kit/core/skills/consult-workflow/SKILL.md`) : le **socle** commun, et ce qui ne se charge jamais. Chaque session charge en plus **une seule phase**, par son point d'entrée : `/raffiner [feature]` (skill `raffiner`) ou `/realiser [feature]` (skill `realiser`). « Consulte le workflow » seul dit où en est la feature et quelle commande lancer.

## Découverte d'information — réflexes de recherche

Chercher avant de lire en entier : les fichiers de feature, `DONE-*` non compactés et fichiers meta sont volumineux.

- **Fichier de feature actif** (`.agents/feature/<slug>.md`) : sommaire (`grep -n '^## \|^### '`), puis `## Progression`, `## Registre des décisions` et la section de l'étape en cours. Jamais tout le fichier pour une décision locale.
- **Fichiers meta** (`.agents/reference-utilitaires.md`, `.agents/domain-glossary.md`) : sommaire (`grep -n '^## \|^### '`), grep des mots-clés, puis lecture des seuls blocs `### …` retenus. `.agents/specs/spec-parallele.md` : index, puis entrées.
- Le `path` du Grep = **dossier**, jamais un fichier (l'outil élargit au parent). Pour cibler un fichier précis → filtre de fichiers de l'outil (`include` sous opencode, `glob` sous Claude Code) avec le nom (`"DONE-xxx.md"`).
- Pattern le plus **discriminant** d'abord : cibler la section (`^## Résumé métier`, `### SP-XXX`) plutôt qu'un mot-clé fréquent.
- Ordre de lecture d'une `DONE-*` : `## Résumé métier` (tête) → grep de section (fichier compacté : `## Registre des décisions`, `## Clé de lecture des scénarios`, `## Décisions & Justifications`, `## Arbre de flux`, `## Leçons de réalisation`, `## Vigilances`, `## Dette connue`) → lecture à l'offset.
- Version de travail d'un fichier compacté : `git show <hash>:<chemin>`, hash donné par la ligne de clôture de l'en-tête.
- Sortie tronquée / bruit ≥ ~20 matches → resserrer (filtre de fichiers + pattern), ne pas dépouiller.
