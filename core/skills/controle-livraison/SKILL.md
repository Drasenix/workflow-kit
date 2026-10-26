---
name: "controle-livraison"
description: "Contrôle de livraison d'un fichier de feature : vérifie mécaniquement que la Progression est cohérente et qu'aucune trace meta (question, ambiguïté, [À CONSIGNER], [AMENDE SP-*], [À VALIDER], utilitaire à référencer, fichier meta à mettre à jour, SP-* annoncé) n'est restée non tranchée, puis fait régler les écarts avec l'utilisateur. Also checks scenario format (one WHEN, at least one THEN) and edge cases at the end of step 1 (before the step-1 pause) and open ambiguities at the 1→2 milestone, and at delivery the project meta files (spec-parallele integrity, dead file references, case-sensitive). Use at the end of step 1, at the 1→2 and 6→7 milestones, before proposing any commit that contains a feature file, after any backtrack, or when the user asks to check a feature (« contrôle la feature », « contrôle de livraison », « check »)."
---

# controle-livraison

Un fichier de feature accumule des signalements à trancher (questions, puces `[À CONSIGNER]`, utilitaires à référencer, fichiers meta à mettre à jour). Un oubli s'y propage à toutes les features suivantes. Ce contrôle est **mécanique** : il ne dépend ni de la mémoire du modèle, ni du chemin suivi (backtrack, correction en cours d'étape, refacto).

- Partie **mécanique** (script, Windows et Linux) : `node workflow-kit/bin/workflow-kit.mjs check .agents/feature/<chemin>/<slug>.md` — sortie `[ok]` ou `[KO]` avec la liste des écarts, ligne par ligne ; à la livraison, il contrôle aussi les fichiers meta du projet.
- Partie **jugement** (Build + utilisateur) : trancher chaque écart. Le contrôle ne se contourne jamais.

## Déclenchement

L'agent principal (le raffineur aux étapes 0-1, le Build ensuite) le lance **sans attendre qu'on le lui demande** (cf. `workflow-kit/core/agent-build.md` § Fichiers meta, `workflow-kit/core/phase-raffinement.md` § Jalon 1→2, `workflow-kit/core/phase-realisation.md` § Jalon 6→7) :
- à la **fin de l'étape 1**, avant la pause 1 — l'arrêt 2 du raffinement — (ligne 1 encore `🔄`) : format des scénarios et des edge cases, questions tranchées — les GWT présentés à l'utilisateur sont bien formés ;
- au **jalon 1→2**, ligne 1 à OK : ambiguïtés tranchées ;
- au **jalon 6→7**, avant le renommage `DONE-<slug>.md` ;
- **avant de proposer tout commit** qui contient un fichier de feature (le fichier a pu bouger depuis le jalon) ;
- **après chaque backtrack**, une fois les lignes passées en 🔁 : la partie structurelle doit être verte avant de réinvoquer le subagent.

L'utilisateur peut aussi le demander à tout moment (« contrôle la feature », `/controle-livraison`).

## Ce qui est contrôlé

| Quand | Contrôle | Écart signalé |
|---|---|---|
| Toujours | Statuts de `## Progression` reconnus : ✅ / OK / sauté / ⏭️ / ⬜ / 🔄 / 🔁 | statut non reconnu |
| Toujours | Aucune étape faite alors qu'une précédente est ⬜ / 🔄 / 🔁 | Progression incohérente |
| Toujours | Une ligne 🔁 implique au moins une ligne au `## Registre des décisions` | backtrack non tracé |
| Étape 1 en cours ou faite | Chaque `### Scénario` des sections de scénarios : exactement un WHEN, au moins un THEN (blocs de code compris ; un scénario réduit à son titre est ignoré) | scénario mal formé |
| Étape 1 en cours ou faite | `## Edge cases identifiés` : `✅ couvert` cite un scénario, `❌ non couvert` porte sa justification | edge case incomplet |
| Étape 1 en cours ou faite | `## Questions specs` : aucune case `- [ ]` avec texte | case non cochée |
| Étape 1 faite (jalon 1→2) | `## Ambiguïtés à valider` : aucune case `- [ ]` avec texte (tranchées à la pause 1) | case non cochée |
| Étape 1 faite (jalon 1→2)¹ | `## Contexte technique` rempli (faits du code, ou `Aucun`) | section vide |
| Étape 1 faite (jalon 1→2)¹ | `## Arbitrages du challenge` rempli (`Aucun écart` ou une ligne par écart) ; chaque écart porte son arbitrage | section vide / écart non arbitré |
| Étape 3 faite (pause 3)¹ | `## Plan` : `### Arbre de flux` et `### Fichiers à créer / modifier` remplis (`Aucun` admis) | section vide |
| Étape 4 faite (jalon 4→5)¹ | `## Plan` : `### Écarts au plan` rempli (`Aucun` ou écarts déclarés) | section vide |
| Étape 5 faite (pause 5)¹ | `### Décisions techniques` rempli (`Aucune` ou une ligne par décision) ; chaque ligne porte sa décision proposée | section vide / décision sans proposition |
| Livraison (étape 6 faite, ou `DONE-*`) | Lignes 0 à 6 faites | étape non faite |
| Livraison | Puce commençant par `[À CONSIGNER]`, `[AMENDE SP-*]` ou `[À VALIDER]` : porte `→ ✅ …` ou `→ ⛔ …` | tag non tranché |
| Livraison | `### Nouveaux utilitaires à référencer` : chaque puce porte `→ ✅ référencé` ou `→ ⛔ …` | utilitaire non tranché |
| Livraison | `## Conventions (fichiers-rôles)` : statut de chaque ligne commençant par ✅ ou ⛔ | fichier meta non mis à jour |
| Livraison | `## Nuances consignées` : chaque `SP-*` présent dans l'index **et** les entrées de `.agents/specs/spec-parallele.md` | `SP-*` absent |
| Livraison (projet) | Intégrité de `.agents/specs/spec-parallele.md` : index ↔ entrées, statuts identiques (« en vigueur » / « caduc » + cible), toute référence `SP-*` vise une entrée, `Mots-clés` présents | écart d'intégrité |
| Livraison (projet) | Références mortes : chaque chemin entre backticks de `.agents/*.md` et du spec parallèle existe, **casse comprise** (Windows l'ignore, Linux non). Un chemin ignoré par git ou cité sous son nom d'avant clôture (`x.md` pour `DONE-x.md`) n'est pas signalé | référence morte |

Les deux contrôles « projet » existent aussi seuls : `node workflow-kit/bin/workflow-kit.mjs check-meta` (`--spec` ou `--refs`), utilisés par `@review` (étape 5) et par le Build après chaque écriture du spec parallèle. Une mention **volontaire** d'un fichier disparu (liste de fichiers supprimés…) se marque `<!-- refs:historique -->` sur sa ligne, ou sur son titre pour toute la section.

¹ Seulement si le fichier porte la section (gabarit à deux phases) : un fichier ouvert avec un gabarit antérieur n'est pas contrôlé sur ces points. Une section « remplie » a au moins un contenu hors consigne (`> …`) : un libellé de puce sans valeur (`- **Point d'entrée** :`) ou la ligne vide d'un tableau du gabarit ne comptent pas.

Un fichier sans `## Progression` (compacté, ancien format) n'est pas contrôlé. Les fichiers clos avant cette convention ne sont pas à remettre en conformité : seule la feature en cours se contrôle.

## Procédure

1. **Lancer** le script sur la feature en cours ; joindre la sortie au rapport.
2. **`[ok]`** → continuer (passage DONE, proposition de commit, réinvocation du subagent).
3. **`[KO]`** → ne pas continuer. Pour chaque écart, selon sa nature :
   - **à trancher** (case, tag, utilitaire) : le présenter à l'utilisateur, inscrire sa décision au `## Registre des décisions` **d'abord**, puis marquer la puce `→ ✅ <où>` ou `→ ⛔ <raison>` et, si une écriture est décidée, ajouter la ligne ⬜ dans `## Conventions (fichiers-rôles)` ;
   - **référence morte / intégrité** : corriger le fichier meta (chemin, casse, index ↔ entrée) ; mention volontaire d'un fichier disparu → `<!-- refs:historique -->` ;
   - **à écrire** (ligne ⬜ des fichiers meta, `SP-*` absent) : l'écriture a déjà été validée → le Build l'écrit (`.agents/reference-utilitaires.md`, `.agents/domain-glossary.md`, fichier-rôle, `.agents/specs/spec-parallele.md`, puis `node workflow-kit/bin/workflow-kit.mjs check-meta --spec` jusqu'à `[ok]`), puis passe la ligne à ✅ ;
   - **structurel** (Progression, statut inconnu, backtrack non tracé) : corriger le tableau ou le Registre ; incohérence réelle → pause utilisateur (`workflow-kit/core/agent-workflow.md` § Incohérence de Progression).
4. **Relancer** le script jusqu'à `[ok]`.

## Garde-fous

- Le contrôle **ne se contourne jamais** : pas de marquage `→ ✅` sans décision réelle de l'utilisateur, pas de statut maquillé pour passer.
- Aucune écriture de fichier meta sans accord explicite (le mot « go », « oui », « ok » ou « ajoute » apparaît dans la réponse).
- Un `[KO]` sur un fichier clos ancien n'est pas une anomalie : ne rien y corriger sans demande.
