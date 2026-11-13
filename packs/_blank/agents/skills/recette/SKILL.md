---
name: "recette"
description: "Recette manuelle post-DONE (feature livree, ou chantier dont tous les lots sont livres) : scenarios utilisateur, jeu de donnees jetable local, fiche de recette a part sur la branche recette/<feature>. A completer pour la stack du projet."
---

# recette

> Squelette du pack `_blank`. Version complete : `packs/laravel-livewire/agents/skills/recette/`.

## Declenchement

- `/recette`, « recette manuelle », « je dois tester » apres une feature livree (ou un chantier dont tous les lots sont livres).

## Garde-fous

1. Jamais en production/staging : verifier l'environnement local avant tout seed.
2. Jeu de donnees jetable et isole, jamais reference par les seeders existants.
3. Fiche de recette = fichier a part (`RECETTE.md` du dossier d'un chantier, `RECETTE-<slug>.md` a cote d'un DONE), jamais une section du DONE.
4. Seeder et fiche sur la branche `recette/<feature>`, jamais fusionnee vers la production ; supprimee sur accord une fois la feature en production.

## Workflow

1. Analyser les `DONE-*` du perimetre.
2. Deriver les scenarios utilisateur par parcours (Etant donne / Quand je / Alors je dois voir, ligne « Couvre »).
3. Creer un jeu de donnees jetable si l'etat n'est pas atteignable via l'UI.
4. Executer en local, ecrire la fiche (avec son tableau `## Constats` vide), commiter sur la branche de recette.
5. Proposer `/recette-navigateur` pour la faire jouer par l'agent.
