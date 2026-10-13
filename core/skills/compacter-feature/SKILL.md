---
name: "compacter-feature"
description: "Compacte un fichier de feature clos (DONE-*, ABANDON-*, IRREPRODUCTIBLE-*) après son commit de livraison : garde ce qui a une valeur d'apprentissage pour les agents (pourquoi, comportement garanti, parcours, dette, leçons, vigilances) et retire ce qui ne servait que pendant la réalisation. Use when the user asks to compact or clean a closed feature file (« compacte DONE-x », « dépollue les DONE ») or right after the delivery commit of a feature."
---

# compacter-feature

Un fichier de feature clos garde par défaut tout le **document de travail** : questions, contrat, checklists, copies de règles. Cette skill le réduit à ce qui **sert encore après coup**, sans perte : git conserve la version de travail.

- Partie **mécanique** (script) : `node workflow-kit/bin/workflow-kit.mjs compact <chemin>` écrit le squelette ; les sections reprises sont recopiées **à l'octet près**, les sections à rédiger portent le marqueur `[À COMPLÉTER]`.
- Partie **jugement** (agent) : rédiger les sections marquées à partir du résiduel signalé par le script.
- Squelette de référence : `workflow-kit/core/templates/feature-cloturee.md`.

## Déclenchement

- L'utilisateur dit « compacte `DONE-<slug>` », « dépollue les DONE », « compaction des features closes ».
- Le Build la **propose** après le commit de livraison d'une feature passée en `DONE-*`, `ABANDON-*` ou `IRREPRODUCTIBLE-*` (cf. `workflow-kit/core/agent-build.md` § Gestion des features).

## Principe : deux questions par contenu

1. **A-t-il une valeur d'apprentissage après coup ?** Pourquoi (ADR, arbitrages), comportement garanti (GWT), parcours dans le code (arbre de flux), dette restante, leçons de réalisation, vigilances → **garder**.
2. **Ne servait-il qu'à piloter la réalisation, ou recopie-t-il une source qui fait foi ?** Progression, texte des questions, contrat, fichiers prévus, checklists, plan de refacto ; copies du spec parallèle, des fichiers-rôles, de `.agents/reference-utilitaires.md`, du backlog → **retirer**. Une copie qui périme est un **passif** : un agent peut s'y fier après une supersession.

Le fichier compacté est une **photo à la date de livraison** : on n'y ajoute **rien de postérieur** (pas de « constaté le … », pas de note de péremption). La date et le hash de la ligne de clôture suffisent à le situer.

## Garde-fous

1. **Jamais avant le commit de livraison.** Le script refuse un fichier jamais committé ou modifié localement.
2. **Intégrité des identifiants.** Tout identifiant interne cité ailleurs (listé par le script) reste présent dans le fichier compacté.
3. **Rien de transversal n'est supprimé sans être consigné ailleurs.** Sinon : proposer la remontée (accord explicite), garder la trace sur une ligne.
4. **Feature active dépendante.** Si une feature **en cours** cite des sections destinées à être supprimées (contrat, texte d'une question…), ne pas compacter : attendre sa clôture, ou demander.
5. **Nom du fichier inchangé** (il est cité par le spec parallèle et les backlogs).
6. **Pause** : l'utilisateur valide le diff. Commit séparé **sur demande explicite uniquement** (`docs(<domaine>): compacter <fichier>`), jamais de push.

## Procédure

1. **Squelette** : `node workflow-kit/bin/workflow-kit.mjs compact <chemin>` (`--dry-run` pour simuler). Le script :
   - reprend tels quels l'en-tête (+ ligne de clôture), le Résumé métier, les scénarios (sans leur introduction ; baselines « déjà couverts » réduits à leur titre), l'arbre de flux (extrait de l'Architecture, qu'il soit sous un titre ou sous un paragraphe en gras « **Arbre …** » suivi d'un bloc de code), les ADR, la recette manuelle ; une section reprise vide (titre en double) est ignorée ;
   - liste le **résiduel à examiner** (sections supprimées, avec leurs plages de lignes dans une **copie numérotée** de la version de travail) ;
   - liste les **renvois externes** : identifiants cités par les lignes de `.agents/` qui visent ce fichier ou ce lot. Les identifiants ne sont **pas uniques** d'une feature à l'autre (un « A2 » peut être un lot ou une ambiguïté) : le script écarte les lots cités avec leur fichier, le reste est à vérifier. Il ne voit que les lignes qui citent le fichier (nom complet ou court) ou « feature `<lot>` » : une citation sans ces repères (ex. un identifiant dans le bloc d'un lot du backlog) est à chercher à la main dans les backlogs du chantier.
2. **Lire le résiduel** dans la copie numérotée, aux plages indiquées (pas de lecture intégrale nécessaire).
3. **Rédiger les sections marquées** selon les règles ci-dessous. Une section **sans contenu se supprime entièrement** ; une ligne sans objet porte « aucun ».
4. **Contrôle** : `node workflow-kit/bin/workflow-kit.mjs compact <chemin> --check`. Bloquant : marqueur restant, en-tête modifié, section reprise **différente ou incomplète**. Avertissement : identifiant cité ailleurs absent du fichier (vérifier).
5. **Pause** : présenter la mesure avant/après, le contenu rédigé, les remontées proposées ; attendre la validation.

## Règles de rédaction (sections marquées)

- **Ligne de clôture** : compléter « test global » (« vert », « N verts ») d'après la version de travail ; si rien n'y figure, retirer ce segment.
- **Registre des décisions** : **seulement** les décisions qui ne sont portées ni par un ADR, ni par le périmètre de l'en-tête, ni par un scénario, **ou** dont l'identifiant est cité ailleurs. Format `ID · décision · date · → où consigné`. Une question restée sans réponse n'est pas une décision. Souvent vide : section supprimée.
- **Dette connue** : edge cases non couverts (avec le lot ou la feature qui les reprend, ou « — » s'ils ont été vérifiés une fois par la revue), hors-périmètre ; ligne « Couverts : EC-… ».
- **Leçons de réalisation** : uniquement ce qui a **mal tourné puis été corrigé** (refacto appliqué, re-vérification, backtrack, jalon ou test global en échec) : `constat → correction → règle retenue (où elle est consignée)`.
- **Vigilances** : un constat (challenge, problèmes détectés, patterns, colonne « Rôle » des fichiers) n'y entre que si **un agent futur risque de le casser ou de le rejouer** et que **ni le code, ni un test, ni un ADR, ni un fichier-rôle** ne le protège déjà. Le reste est du bruit.
- **Traçabilité** : spec et US couvertes (sections consultées, US du backlog), `SP-*` créées ou mises en œuvre (identifiants seuls, le texte vit dans le spec parallèle), conventions établies, utilitaires référencés.
- **Remontée** : une vigilance ou une leçon **transversale** est proposée au fichier-rôle concerné, avec accord ; la ligne du fichier clos le signale (« remontée proposée vers … »).
- **Étalon** : si le projet a désigné un fichier compacté de référence (ligne « Étalon compaction » dans `.agents/templates-index.md`), s'aligner sur son niveau de détail.

## Grilles

| Section de la version de travail | DONE | ABANDON | IRREPRODUCTIBLE |
|---|---|---|---|
| En-tête | repris + clôture | repris + ligne d'abandon | repris + clôture |
| Résumé métier | repris | repris | repris |
| Scénarios baseline / évolution | repris (baselines « déjà couverts » → titres) | titres seuls | retirés |
| Arbre de flux (titre variable) | repris | — | — |
| ADR | repris | repris | repris |
| Recette manuelle | reprise | reprise | reprise |
| Progression, Specs consultées, Questions, Ambiguïtés, Edge cases, Conventions, Architecture, Revue, Nuances | retirés → résiduel | retirés → résiduel | retirés → résiduel |
| Sections propres au type (Raison de l'abandon, Symptôme, Hypothèses…) | — | reprises, sinon gabarit | reprises, sinon gabarit |
| Section hors grille | reprise, signalée : à trancher | idem | idem |

ABANDON : les **questions restées ouvertes** se rédigent **en texte intégral** (réutilisables en cadrage PO si le sujet revient). IRREPRODUCTIBLE : les **hypothèses éliminées** gardent leur **preuve**.

## Plusieurs fichiers (rattrapage)

- **Pilote d'abord**, puis un fichier représentatif des cas lourds (refacto appliqué, arbre de flux, renvois croisés) avant de lancer le lot.
- Ensuite par domaine : un fichier par sous-agent (qui applique cette skill), `--check` de **chaque** fichier par le Build, validation du diff par l'utilisateur.
- Exclure les fichiers dont une feature active cite des sections à supprimer (garde-fou 4).
