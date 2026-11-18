---
name: "cloturer-recette"
description: "Clôture une recette terminée : démonte l'environnement de son worktree, retire le worktree, supprime la branche recette/<feature> en local et sur origin, et nettoie les résidus laissés par l'agent ; le dossier de livraison (PDF, captures) n'est jamais touché. Use when the user says « /cloturer-recette », « clôture la recette [feature] », « supprime le worktree de recette », or wants to throw away a recette branch once its delivery is done."
---

# cloturer-recette

Une branche `recette/<feature>` est jetable : elle porte la fiche de recette, le seeder jetable et les constats, qui ne partent jamais en production. Une fois la recette livrée (dossier de livraison hors dépôt), cette skill retire tout ce qu'elle a laissé derrière elle.

- **Partie mécanique** (script) : `node workflow-kit/bin/workflow-kit.mjs cloturer-recette <feature> [--teardown "<commande>"] [--dry-run] [--force]`, lancé depuis le checkout principal : démontage de l'environnement du worktree, retrait du worktree, suppression de la branche locale puis distante.
- **Partie agent** : retrouver la branche, lire la commande de démontage du projet, simuler, clôturer, retirer les résidus hors dépôt, rapporter.

## Entrée

- `/cloturer-recette <feature>` : le slug (`ma-feature`) ou le nom complet (`recette/ma-feature`).
- Sans argument : lister les branches `recette/*` (locales, worktrees, `origin`). Une seule : la prendre ; plusieurs : demander laquelle ; aucune : le dire.

## Garde-fous

1. **Branches de recette seulement** : le script refuse tout autre préfixe. Une branche de feature ne se clôture jamais ici.
2. **Rien ne se perd en silence** : le script s'arrête sans rien supprimer si le worktree n'est pas propre ou si des commits ne sont pas poussés. `--force` seulement sur accord explicite de l'utilisateur, après lui avoir montré ce qui serait perdu.
3. **Dossier de livraison** (PDF, captures, sources) : hors dépôt, jamais touché.
4. **Branche distante** : supprimée sans autre confirmation ; `/cloturer-recette` vaut accord.
5. **Depuis le checkout principal** : jamais depuis le worktree à retirer (le script refuse). Si la session tourne dans ce worktree, le dire et proposer de la déplacer dans le checkout principal.

## Étape 1 — Préparer

- **Démontage** : la ligne « nettoyage worktree » de `.agents/workflow-commands.md` (déjà en contexte) donne la commande propre au projet. Elle arrête l'environnement du worktree (services, conteneurs, volumes) et rend à l'utilisateur les fichiers créés par un autre propriétaire. Ligne absente : pas de `--teardown`, le projet n'a pas d'environnement par worktree.
- **Simulation** : la commande du script avec `--dry-run`. Lire le plan. Un refus (worktree non propre, commits non poussés, branche extraite dans le checkout principal) : le montrer à l'utilisateur et s'arrêter.

## Étape 2 — Clôturer

- La même commande, sans `--dry-run`.
- Fichiers d'un autre propriétaire restés dans le worktree : le script s'arrête avant de le retirer. Le signaler : la commande de démontage du projet est à compléter. Ne pas les supprimer à la main avec des droits élevés sans accord.
- Démontage en échec : le script s'arrête, worktree et branche en place. Rapporter la sortie, ne pas relancer avec `--force`.

## Étape 3 — Résidus hors dépôt

Ce que la recette a laissé ailleurs que dans le worktree :
- captures déposées dans le checkout principal par l'outil de navigation (ex. `.openchamber/`), si git ne les suit pas ;
- onglets de navigateur ouverts par l'agent pour la recette ;
- dossiers temporaires créés par l'agent pendant la recette (scripts de capture, images de travail).

Jamais : le dossier de livraison, un fichier suivi par git, un dossier dont l'agent n'est pas l'auteur. À la fin, `git status` du checkout principal est celui du départ.

## Rapport

- **Supprimé** : environnement, worktree, branche locale et distante, résidus.
- **Gardé** : le dossier de livraison (chemin).
- **Reste à faire**, s'il y a lieu : livraison de la feature, mise en service.
