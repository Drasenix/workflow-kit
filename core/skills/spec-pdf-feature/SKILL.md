---
name: "spec-pdf-feature"
description: "Dossier client d'une feature livrée : note de synthèse (PDF) et page « À lire d'abord » qui ouvre l'envoi. La note dit ce que fait le produit, en langage métier, d'après les règles en vigueur du référentiel (spec parallèle SP-*) et les fichiers DONE-* ; état final seulement, jamais l'histoire du chantier ; gabarit fourni, contrôle mécanique des termes, rapport de traçabilité dans la conversation. Use when the user asks for the client spec PDF, synthesis note or client package cover page of a delivered feature (« /spec-pdf-feature », « spec PDF de … », « note de synthèse », « spec pour la cliente », « dossier client », « page à lire d'abord »). Not for the recette PDF (« PDF de recette », « recette client » : skill recette-navigateur)."
---

# spec-pdf-feature

Le dossier client d'une feature livrée : une **note de synthèse** (ce que fait le produit, en langage métier, explicite, sans rien de l'histoire du chantier) et une **page « À lire d'abord »** qui ouvre l'envoi (contexte, état d'avancement, documents, attentes, lexique). Le dépôt n'est pas modifié : les PDF et leurs sources HTML vont dans un dossier de livraison hors dépôt ; rien n'est commité, rien n'est noté dans le projet.

## Entrée

- `/spec-pdf-feature <feature>` : dossier de la feature sous `.agents/feature/`, son slug, ou le chemin d'un de ses `DONE-*`. Absente : la demander.
- **Une question de départ, à chaque usage**, avant toute rédaction, en une seule fois :
  - **dossier de livraison**, hors dépôt : proposer un dossier existant pour cette feature s'il y en a un (celui de sa recette, à côté du dépôt), sinon demander ;
  - **état** : la feature est-elle en production ? Sinon, la suite à annoncer (date, ou « planifiée avec vous une fois vos retours intégrés ») ;
  - **destinataires** (direction, gestionnaires…) et **documents joints** : ceux du dossier de livraison (PDF de recette de la skill `recette-navigateur`…) et ceux que l'utilisateur nomme (guide, pistes…) ;
  - **impression** : Chrome ou Chromium sans interface. Proposer celui du poste (`command -v chromium google-chrome chromium-browser`), sinon celui que donne la commande `fallback` de `.agents/workflow-commands.md` (`<fallback> chromium --version`).
- Les réponses ne sont notées nulle part : la question revient au prochain usage.

## Sources

Lecture ciblée, jamais un fichier entier.

1. **Les `DONE-*` du dossier** : le besoin (`## Résumé métier`), les comportements garantis (scénarios), les libellés exacts des écrans et des messages. Protocole de lecture : `workflow-kit/core/skills/doc/SKILL.md` § « Protocole de lecture (obligatoire) ». Les sections de pilotage, de dette, de leçons et de vigilances ne nourrissent jamais la note.
2. **Les règles** : `.agents/specs/spec-parallele.md`, index puis entrées ciblées. Périmètre : les entrées que citent les `DONE-*` (section de traçabilité) et celles dont la ligne `Source` ou `Gardé par` cite ces `DONE-*` (`Source` = origine de la règle ; `Gardé par` = ses tests, ou la feature qui l'implémente selon la convention du projet).
   - **✅ en vigueur seulement.** Une entrée **⛔ caduc (→ SP-…)** est remplacée par celle qu'elle désigne ; son contenu n'apparaît jamais dans la note.
   - **Version amendée.** Une entrée en vigueur peut porter `Amendé par` ou `Précisé par` : elle vaut telle que les entrées citées la modifient. La note décrit l'état qui résulte de l'ensemble, jamais une phrase qu'une entrée plus récente a changée (« le produit ne crée jamais de code », amendée par « il en attribue un quand le client n'en a pas » : seule la seconde existe pour la note).
   - Écart entre un `DONE-*` et une règle en vigueur : la règle prime.
3. **Le glossaire** (`.agents/domain-glossary.md`) : les mots de la cliente. La spec officielle (`.agents/specs/spec.txt`) seulement pour situer une règle.
4. **Jamais** : les lots à venir (`LOT-*`), les documents de chantier (`SPECS.md`, `BACKLOG.md`, `FICHE-REUNION.md`), les `PLAN-*` et `REFACTO-*`. Le code, seulement pour vérifier un libellé d'écran.
5. **Feature en partie livrée** : la note couvre les seuls `DONE-*` ; le rapport le dit.

## Règles d'écriture

1. **L'état final, rien que lui.** La note dit ce que fait le produit. Aucun récit du chantier : ni option écartée, ni décision revenue, ni « on a retiré X pour faire Y » (on décrit Y), ni « finalement », « au final », « initialement », « dans un premier temps », ni numéro de lot, ni date de décision, ni règle caduque. Un « avant » n'est permis que par rapport à ce que la cliente avait en production avant la feature (un comportement qu'elle connaissait, un défaut corrigé). Dans le doute, décrire seulement l'état final.
2. **Explicite.** Chaque point dit qui fait quoi, quand, et ce qu'on voit : boutons, messages, statuts et documents avec leur libellé exact entre « ». Un exemple daté ou chiffré dès qu'une règle porte sur une date, un montant ou une durée (« deux échéances sur un contrat trimestriel couvrent six mois »). Pas de verbe vague sans contenu (« gère », « prend en charge », « optimise », « améliore »). Le pourquoi est donné quand une règle peut surprendre.
3. **Les mots de la cliente.** Écrans, boutons, statuts, documents et rôles tels que l'application les affiche. Correspondances :

   | Côté projet | Dans la note |
   |---|---|
   | spec parallèle | référentiel de règles du produit |
   | entrée `SP-<DOMAINE>-NN` | règle de gestion, référence `NN` (sans `SP-`) ; le domaine est nommé dans le pied de page |
   | tests | vérifications automatiques |
   | fichier `DONE-*` | évolution livrée |
   | nouvel essai d'un envoi différé | nouvel essai automatique |
   | service externe, API | le nom du service, tel que la cliente le connaît |

   Aucun nom de classe, de méthode, de fichier, de champ, de table, de route, de branche ni de commit.
4. **Rien d'inventé.** Chaque phrase s'appuie sur une règle en vigueur ou sur un `DONE-*`. Sinon : question à l'utilisateur, jamais de supposition.
5. **Court.** Une puce par notion, ouverte par sa notion en gras ; un seul exemple par règle datée ou chiffrée. Visée : deux à quatre pages ; cinq pour une feature de plus de trente règles, le tableau des règles occupant alors plus d'une page.

## Structure

Gabarit : `workflow-kit/core/skills/spec-pdf-feature/assets/gabarit-note.html` (mise en page, ordre des blocs, consignes en commentaire). Texte seul, sans capture.

1. Surtitre « Note de synthèse — <domaine> », titre « <Domaine> : <la feature> », date du jour et périmètre sur une ligne.
2. Introduction : deux ou trois phrases, ce que la feature permet et le nombre de règles qui l'encadrent.
3. Trois chiffres clés :
   - **règles de gestion** : les entrées en vigueur du périmètre ;
   - **évolutions livrées** (feature en production) ou **évolutions réalisées** (pas encore en production ; l'introduction dit alors l'état d'avancement en une phrase) : les `DONE-*` du dossier ;
   - **vérifications automatiques au vert** : le total du `test global` de `.agents/workflow-commands.md` (avant de le lancer : `.agents/skills/tests/SKILL.md`), relancé sur la branche où la feature est livrée. Un échec arrête la skill : aucune note n'annonce des vérifications en échec.
4. Sections numérotées **par thème métier** (ce que voit et fait l'utilisateur), jamais par lot ni par ordre de livraison.
5. « Ce qui est à préparer », si la feature demande une mise en route (paramétrage, données à charger, rôle à attribuer).
6. « Les N règles de gestion » : toutes les règles en vigueur du périmètre, une ligne chacune (référence, ce que la règle garantit), groupées par thème au-delà d'une quinzaine.
7. « Ce qui n'est pas touché » : ce que la feature laisse inchangé, vérifié par la suite complète de vérifications automatiques. « Hors périmètre » en plus, si les règles en énoncent un.
8. Pied de page : la place de ces règles dans le référentiel (« références 19 à 31 ») et leur couverture par des vérifications automatiques.

## Contrôles, avant de livrer

1. **Termes** : `pdftotext <pdf> - | grep -n -i -E '<termes>'`, avec `<termes>` = `\bspec\b|SP-|DONE-|LOT-|\blots?\b|chantier|caduc|finalement|au final|initialement|dans un premier temps|à l'origine|itération|version précédente|\btests?\b|seeder|migration|\bbranches?\b|commit|dette|ticket|backlog|\bAPI\b`, plus les noms techniques rencontrés dans les sources (classes, champs, routes). Chaque occurrence est retirée, ou justifiée dans le rapport : libellé d'écran exact entre « » (« Clé API »), ou mot du métier (« un lot de cartons »).
2. **Règles** : chaque ligne du tableau est une entrée ✅ en vigueur ; aucune règle caduque citée, ni son contenu.
3. **Chiffres** : relus contre leurs sources.
4. **Mise en page** : au moins une page regardée en image (`pdftoppm -png -r 60 -f <n> -l <n> <pdf> <préfixe>`) ; aucun titre seul en bas de page, aucune page blanche à la fin.

## Page « À lire d'abord »

Une page, en tête de l'envoi, pour un lecteur qui découvre le sujet. Gabarit : `workflow-kit/core/skills/spec-pdf-feature/assets/gabarit-accueil.html`. Écrite à la première personne (« je », jamais « on »), avec les mêmes règles d'écriture et les mêmes contrôles que la note.

1. **De quoi il s'agit** : trois phrases, ce que la feature change pour l'exploitant.
2. **Où en est le travail** : l'état donné à la question de départ (en production depuis…, ou réalisée et vérifiée, pas encore en production), et la suite annoncée. Cohérent avec la note : jamais « livrée » d'un côté et « en cours » de l'autre.
3. **Les documents** : un tableau dans l'ordre de lecture — document, ce qu'il contient, pour qui, durée de lecture. La note de synthèse d'abord ; un document long (PDF de recette) « à consulter ».
4. **Ce que j'attends de vous** : les réponses attendues (questions ouvertes des documents joints, avis demandés) ; « Rien : pour information » s'il n'y en a pas.
5. **Lexique** : les termes du domaine que les documents emploient sans les définir (glossaire `.agents/domain-glossary.md`, vocabulaire d'un service externe), une ligne chacun, avec les mots de la cliente.

Une seule page : la resserrer (marges, espacements) plutôt que de déborder.

## Livraison

1. Copier le gabarit dans un dossier de travail, le remplir, imprimer : `<chrome> --headless --no-pdf-header-footer --print-to-pdf=<sortie.pdf> <html>`. Impression par la commande `fallback` : dossier de travail dans le projet, ignoré par git (`git check-ignore <dossier>`) et visible depuis cette commande.
2. Dans le dossier de livraison : `Spec-<feature>.pdf`, `00-A-lire-d-abord-<feature>.pdf` et leurs sources `spec-<feature>.html`, `a-lire-d-abord-<feature>.html`, gardées pour les retouches. Dossier de travail supprimé ; `git status` identique à celui du départ.
3. **Rapport**, dans la conversation (jamais dans la note) :
   - chemin du PDF, nombre de pages, chiffres clés ;
   - traçabilité : chaque section et les références des règles qui la fondent ;
   - règles du périmètre laissées hors des sections (présentes dans le seul tableau), et pourquoi ;
   - occurrences de termes justifiées ;
   - questions restées ouvertes.
