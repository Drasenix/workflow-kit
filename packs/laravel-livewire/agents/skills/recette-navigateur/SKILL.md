---
name: "recette-navigateur"
description: "Recette jouée par l'agent lui-même dans le navigateur, à partir d'une fiche de recette (skill `recette`) et de son seeder jetable : parcours réel de chaque scénario, capture de chaque résultat visible, vérifications hors écran (emails de développement, API externes en lecture), constats OK / KO, puis dossier de recette hors dépôt (captures, README et PDF de recette destiné au client). À charger quand l'utilisateur demande à l'agent de faire la recette lui-même, de passer la recette au navigateur, de (re)faire les captures ou de produire le PDF de recette (« fais la recette toi-même », « recette navigateur », « refais les captures », « recette client », « PDF de recette »)."
---

# recette-navigateur

L'agent **joue lui-même** une recette manuelle déjà écrite : il la déroule dans un navigateur piloté, photographie ce que l'utilisateur doit voir, vérifie ce qui ne se voit pas à l'écran et livre un dossier de recette. Il **ne corrige rien** : un écart devient un constat.

## Déclenchement

- `/recette-navigateur <feature>`.
- « fais la recette toi-même », « passe la recette au navigateur », « refais les captures », « recette client », « PDF de recette ».

## Entrées

- **Fiche de recette** (skill `recette`, sur la branche `recette/<feature>`) : `RECETTE.md` du dossier d'un chantier, ou `RECETTE-<slug>.md` à côté d'un `DONE` ; ancien format : section `## Recette manuelle` d'un `DONE-*.md`. Avec son **seeder jetable**. Pas de fiche → s'arrêter et proposer `/recette` : les scénarios ne s'improvisent pas.
- **Destinataire** : le PDF est écrit pour le client (§ Le PDF de recette) ; le détail technique reste dans `captures/README.md`, la fiche et le rapport.
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
- **Symboles dans le PDF** : Chrome sans interface n'a que les polices de sa machine ; un symbole absent (★…) s'imprime en caractère parasite. Relire `pdftotext` et retirer ces symboles ; `generer-pdf.py` retire ★.

## Étape 3 — Livrer

Dans le dossier de livraison :

1. `captures/` : les captures brutes (1440 × 900).
2. `captures/README.md` : en-tête (date, URL, branche, seeder, comptes) ; données de départ ; tableau `# | Scénario | Ce que la capture montre | Résultat` ; tableaux des vérifications hors écran ; état laissé par la recette ; limites du passage ; « Rejouer » (commande du seeder).
3. **PDF**, avec les outils de `assets/` (même dossier que cette skill) :
   - préparer les images : `python3 .agents/skills/recette-navigateur/assets/preparer-captures.py <captures> <images> --gauche <largeur de la barre latérale>` (rognage, JPEG qualité 92 : la capture est déjà compressée, sources intactes) ; un groupe par largeur à rogner ;
   - écrire `sources/scenarios.json` dans le dossier de livraison (format en tête de `generer-pdf.py`) : un scénario par entrée, avec son titre, son résultat, ses captures et sa légende, rédigés pour le client (§ Le PDF de recette) ;
   - produire le HTML : `python3 .agents/skills/recette-navigateur/assets/generer-pdf.py sources/scenarios.json <images> <html>` ; une **figure atomique** par résultat (titre, capture et légende solidaires) : aucun titre orphelin, aucune dernière page blanche ;
   - imprimer avec Chrome sans interface (`--headless --no-pdf-header-footer --print-to-pdf=<fichier> <html>`), là où il est installé (poste, ou conteneur de l'application : y copier le HTML et les images) ;
   - `recette-<feature>.pdf` ; `sources/scenarios.json` reste dans le dossier de livraison : il régénère le PDF.
4. **Fiche** : remplir son tableau `## Constats` (OK / KO + numéro de capture) sur la branche `recette/<feature>` ; ancien format sans tableau : l'ajouter en fin de fiche. C'est le seul fichier du dépôt touché.
5. **Rapport** : synthèse OK / KO / non joués ; chaque KO en contexte → problème → capture ; restaurations faites et `git status` ; chemin du dossier de livraison.
6. **Suite** : proposer `/spec-pdf-feature <feature>` pour la note de synthèse et la page d'accueil du dossier client (même dossier de livraison).

## Le PDF de recette

Il est écrit pour le client : les scénarios joués, leurs captures, et pour chacun ce qui se voit à l'écran **et** ce qui a été vérifié hors écran, dit en clair. C'est la preuve du passage, pas une démonstration.

- **Légende** de chaque scénario (`legende` de `scenarios.json`) : le résultat visible (écran, message, tâche, email), puis les vérifications hors écran traduites en effet métier (« statut confirmé chez le partenaire », « accès coupé à 23h59 le jour même »), jamais sous leur forme brute.
- **Termes interdits** dans le PDF : « spec », « SP- », « DONE- », « test », « seeder », « migration », « branche », « commit », « dette » ; les noms techniques du projet (classes, champs, routes) ; les statuts bruts et identifiants d'un service externe (codes de statut, UUID, identifiants internes) ; les noms d'environnement technique ; le jargon d'interface (« toast »). **Contrôle mécanique** : `pdftotext <pdf> - | grep -n -i -E '<termes>'`. Une occurrence n'est gardée que si c'est un texte exact affiché à l'écran, entre « » ; elle est alors citée dans le rapport.
- **Hors du PDF** (README, fiche et rapport seulement) : limites du passage, constats hors périmètre, défauts découverts en chemin, détails de préparation, marques internes (★, retirées par le script), constats techniques bruts. Une simulation se dit simplement (« service rendu volontairement injoignable »).
- **Messages d'erreur** : gardés quand ils sont le résultat attendu d'un scénario (une protection, un refus prévu).
- **KO** : avant de produire le PDF, demander à l'utilisateur d'attendre la correction ou de montrer le scénario « En cours de correction » (`--ko en-cours`). Jamais caché, jamais montré sans son accord.
- **Synthèse** (`synthese`) : à la première personne (« j'ai joué… », jamais « on ») ; nombre de scénarios joués et conformes, ce qui a été vérifié hors écran, nombre de cas non joués ; données annoncées comme fictives.
- **Titres** sans terme technique, reformulés si besoin ; numéros de scénario gardés ; les scénarios non joués n'apparaissent pas, la synthèse les compte.
- **Captures d'outils de développement** (boîte mail de développement…) : rognées pour ne garder que le contenu utile, l'email lui-même (`--gauche`).

## Contexte local (à compléter dans la copie du projet)

- URL de l'application et comptes de recette.
- Boîte mail de développement (URL).
- Dossier de livraison des recettes.
- Largeur de la barre latérale à rogner (px).
- Réglages de durée des toasts (chemins, valeurs d'origine).
- Où tourne Chrome sans interface.
