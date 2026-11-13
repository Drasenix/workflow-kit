---
name: "recette-navigateur"
description: "Recette jouee par l'agent dans le navigateur a partir d'une fiche de recette : captures, constats, dossier de recette et PDF (interne ou version client). A completer pour la stack du projet."
---

# recette-navigateur

> Squelette du pack `_blank`. Version complete : `packs/laravel-livewire/agents/skills/recette-navigateur/`.

## Declenchement

- « fais la recette toi-meme », « refais les captures », « recette client » apres une recette ecrite (skill `recette`).

## Modes

- `interne` (defaut) : tout est montre, KO compris.
- `client` : la recette en version client, constats en langage metier, verifications hors ecran dites en clair ; un KO n'y figure qu'avec l'accord de l'utilisateur.

## Garde-fous

1. Jamais en production/staging : verifier l'environnement local avant tout seed.
2. Aucune ecriture manuelle en base pendant le passage ; aucune correction de code.
3. Modification temporaire (duree des toasts…) seulement avec accord, restauree a la fin.
4. Captures et PDF hors depot ; secrets jamais ecrits ni captures.

## Workflow

1. Preparer : application locale, worker, boite mail de developpement, seeder relance.
2. Derouler chaque scenario dans un navigateur pilote : texte releve, capture, verifications hors ecran, constat.
3. Livrer : captures, README, `sources/scenarios.json`, PDF (interne ou client, voir `generer-pdf.py` de la version complete), tableau des constats de la fiche, rapport.

## Contexte local (a completer)

- URL, comptes, boite mail de developpement, dossier de livraison, outil de capture, generation du PDF.
