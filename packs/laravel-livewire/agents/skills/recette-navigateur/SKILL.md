---
name: "recette-navigateur"
description: "Recette jouée par l'agent lui-même dans le navigateur, à partir d'une fiche de recette (skill `recette`) et de son seeder jetable : parcours réel de chaque scénario, capture de chaque résultat visible, vérifications hors écran (emails de développement, API externes en lecture), constats OK / KO, puis dossier de recette hors dépôt (captures, README, PDF interne ou démo client). À charger quand l'utilisateur demande à l'agent de faire la recette lui-même, de passer la recette au navigateur, de (re)faire les captures ou de produire une démo papier (« fais la recette toi-même », « recette navigateur », « refais les captures », « démo papier », « PDF de recette »)."
---

# recette-navigateur

L'agent **joue lui-même** une recette manuelle déjà écrite : il la déroule dans un navigateur piloté, photographie ce que l'utilisateur doit voir, vérifie ce qui ne se voit pas à l'écran et livre un dossier de recette. Il **ne corrige rien** : un écart devient un constat.

## Déclenchement

- `/recette-navigateur <feature> [interne|client]`.
- « fais la recette toi-même », « passe la recette au navigateur », « refais les captures », « démo papier », « PDF de recette ».

## Entrées

- **Fiche de recette** : section `## Recette manuelle` d'un `DONE-*.md`, ou `RECETTE.md` du dossier de la feature, avec son **seeder jetable** (skill `recette`). Pas de fiche → s'arrêter et proposer `/recette` : les scénarios ne s'improvisent pas.
- **Mode** : `interne` (défaut) — tout est montré, KO compris, légendes techniques admises ; `client` — démo papier en langage métier (§ Mode client).
- **Périmètre** : les scénarios essentiels de la fiche ; options et scénarios à longue attente (plus de 15 min) seulement sur demande.
- **Dossier de livraison**, hors dépôt : celui du § Contexte local (`<dossier de recettes>/<projet>/<feature>/`). Absent → le demander une fois, puis le noter dans le contexte local.

## Garde-fous

1. **Local uniquement** : même garde que la skill `recette` (`APP_ENV=local`) avant tout seed.
2. **Aucune écriture manuelle en base** pendant le passage : les états viennent du seeder et des actions réelles dans l'UI. Une lecture de contrôle (tinker, SQL) est permise et se signale comme telle.
3. **Code** : aucune correction pendant la recette. Une **modification temporaire** (ex. durée des toasts) seulement avec l'accord de l'utilisateur ; restaurée à la fin, `git status` propre vérifié et rapporté.
4. **Services externes** : écritures (préparations, jeux de données tiers) seulement si l'utilisateur les a autorisées pour cette recette ; secrets demandés sur carte privée, jamais écrits ni affichés. Masquer un champ secret avant toute capture.
5. **Hors dépôt** : captures et PDF ne sont jamais commités. L'outil de capture les dépose dans un dossier du projet (ex. `.openchamber/screenshots/`) : les déplacer vers le dossier de livraison au fil de l'eau et ne rien laisser derrière.
6. **Constats honnêtes** : un écart = capture + constat + cause probable si elle est connue. Jamais de KO maquillé en OK, ni de scénario « OK » non joué.

## Étape 1 — Préparer

- Lire la fiche entière : pré-requis, données de départ, ordre des parcours, préparations hors écran.
- Vérifier l'environnement : application accessible, environnement local, migrations à jour.
- Lancer en arrière-plan ce dont la recette dépend, par exemple le worker de file. Les processus qu'il lance héritent de son environnement : après toute modification du `.env` (simuler une panne d'un service externe), **relancer le worker**, sinon les tâches en file gardent l'ancienne valeur. Vider la boîte mail de développement **après** le départ des emails du seed.
- Vérifier la largeur du panneau navigateur (mode `fill`) : s'il est étroit, la capture est rendue à sa taille puis agrandie, donc floue. Demander à l'utilisateur de l'agrandir au maximum avant la première capture.
- Relancer le seeder et garder son rapport (identifiants, emails, liens) : il alimente le README.
- Navigateur piloté : l'outil de navigation de la session (OpenChamber : panneau navigateur — `browser.open`, `snapshot`, `click`, `type`, `select`, `capture`) ; à défaut, Chrome sans interface par script. Fenêtre bureau 1440 × 900.
- Préparations hors écran (service externe, données tierces) : selon l'autorisation (garde-fou 4) ; sinon s'arrêter avant le parcours concerné et attendre l'utilisateur.

## Étape 2 — Dérouler

Pour chaque scénario, dans l'ordre de la fiche :

1. **Étant donné** : constater l'état de départ (snapshot) ; s'il diverge, le noter avant d'agir.
2. **Quand je** : actions réelles dans l'UI (clic, saisie, sélection) ; pas de raccourci par URL, sauf si la fiche le prévoit.
3. **Alors** : relever d'abord le **texte** (snapshot : libellés, montants, messages), puis **capturer** l'écran qui montre le résultat. Un message éphémère se traite à part (§ Pièges connus).
4. **Hors écran** : boîte mail de développement, API externes **en lecture seule**, lecture de base de contrôle. Les résultats vont dans un tableau (une ligne par vérification), jamais dans une capture de terminal.
5. **Constat** : `OK`, `KO` (avec l'écart exact) ou `Non joué` (avec la raison).

Nommage des captures : `NN-<ID>-<objet>.jpg`, dans l'ordre du passage (ex. `07-D1-code-affiche.jpg`) ; une capture refaite prend un suffixe (`11b`).

Traitement en file : recharger après quelques secondes ; ne conclure KO qu'une fois écoulés les essais prévus par la feature.

## Pièges connus

- **Toasts** : ils vivent environ 4 s, une capture en prend environ 7. Soit relever leur texte par snapshot, sans image ; soit, avec accord, allonger temporairement leur durée (réglage JS du toast et durée par défaut côté serveur), capturer, puis **restaurer**. Un toast peut aussi être masqué par une barre d'en-tête : remonter en haut de page pour le capturer, sinon relever son texte.
- **Relevé trop tôt** : après une action qui appelle le serveur (ou un service externe), refaire le relevé plusieurs fois avant de conclure à l'absence d'un message ou d'un résultat.
- **Contenu replié** : le texte relevé n'inclut pas les sections repliées (accordéons, détails d'un journal) ; les déplier avant de conclure à une absence.
- **Éléments non cliquables par leur texte** : une option de liste déroulante faite d'un simple bloc avec action n'est pas reconnue comme cliquable ; la viser par un sélecteur CSS (ex. `div[wire\:click^="…"]`).
- **Fichier à joindre** : l'outil ne joint pas de fichier (import CSV…) : préparer le fichier, demander à l'utilisateur de le choisir dans le panneau, puis reprendre le relevé.
- **Infobulles au survol** : non capturables ; relever leur texte.
- **Netteté** : ne pas sur-échantillonner (aucun gain, fichiers lourds). Rogner la barre latérale et le bas vide : c'est ce qui rend la capture lisible sur papier.
- **Données vivantes d'un service externe** : un passage précédent y laisse des traces. Relancer le seeder et revérifier les collisions d'identifiants avant de rejouer.
- **Heures** : un service externe peut afficher l'UTC ; convertir avant de conclure.
- **Symboles dans le PDF** : Chrome sans interface n'a que les polices de sa machine ; un symbole absent (★…) s'imprime en caractère parasite. Relire `pdftotext` et remplacer ces symboles (ex. `*`).

## Étape 3 — Livrer

Dans le dossier de livraison :

1. `captures/` : les captures brutes (1440 × 900).
2. `captures/README.md` : en-tête (date, URL, branche, seeder, comptes) ; données de départ ; tableau `# | Scénario | Ce que la capture montre | Résultat` ; tableaux des vérifications hors écran ; état laissé par la recette ; limites du passage ; « Rejouer » (commande du seeder).
3. **PDF**, à partir de `assets/gabarit-pdf.html` (même dossier que cette skill) :
   - préparer les images : `python3 .agents/skills/recette-navigateur/assets/preparer-captures.py <captures> <images> --gauche <largeur de la barre latérale>` (rognage, JPEG qualité 92 : la capture est déjà compressée, sources intactes) ;
   - une **figure atomique** par résultat (titre, capture et légende solidaires) : aucun titre orphelin, aucune dernière page blanche ;
   - imprimer avec Chrome sans interface (`--headless --no-pdf-header-footer --print-to-pdf=<fichier> <html>`), là où il est installé (poste, ou conteneur de l'application : y copier le HTML et les images) ;
   - `recette-<feature>.pdf` (mode interne) ou `demo-<feature>.pdf` (mode client).
4. **Fiche** : remplir son tableau des constats (OK / KO + numéro de capture) sur la branche de recette. C'est le seul fichier du dépôt touché.
5. **Rapport** : synthèse OK / KO / non joués ; chaque KO en contexte → problème → capture ; restaurations faites et `git status` ; chemin du dossier de livraison.

## Mode client

- Langage métier : écrans, boutons, statuts, documents, messages. Aucun nom de classe, de fichier, de méthode, de branche, de commit ni de colonne.
- Termes interdits dans le PDF : « spec », « SP- », « DONE- », « test », « seeder », « migration », « branche », « commit », « dette », et les noms techniques du projet. **Contrôle mécanique** : `pdftotext <pdf> - | grep -n -i -E '<termes>'` doit être vide ; résultat dans le rapport.
- Pas de message d'erreur rouge, sauf si la démo doit le montrer (demande explicite). Noms des données annoncés comme fictifs.
- Les limites et les KO ne vont pas dans la démo : ils restent dans le rapport interne.

## Contexte local (à compléter dans la copie du projet)

- URL de l'application et comptes de recette.
- Boîte mail de développement (URL).
- Dossier de livraison des recettes.
- Largeur de la barre latérale à rogner (px).
- Réglages de durée des toasts (chemins, valeurs d'origine).
- Où tourne Chrome sans interface.
