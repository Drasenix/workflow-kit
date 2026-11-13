---
name: "recette"
description: "Recette manuelle post-DONE d'une feature livrée, ou d'un chantier dont tous les lots sont livrés : analyser les DONE, dériver les scénarios utilisateur (Étant donné / Quand je / Alors je dois voir), créer un seeder jetable isolé, l'exécuter en local et écrire la fiche de recette (fichier à part, avec son tableau des constats) sur la branche recette/<feature>. À charger quand l'utilisateur demande une recette manuelle (/recette, « tests manuels », « je dois tester ») après une feature passée en DONE."
---

# recette

Charger cette skill après une **feature passée en `DONE-*.md`**, ou un **chantier** dont tous les lots sont livrés, pour préparer une recette **manuelle** : scénarios orientés utilisateur, seeder jetable exécuté en local, fiche de recette. La jouer ensuite : à la main, ou par l'agent (skill `recette-navigateur`).

## Déclenchement

- L'utilisateur dit **`/recette`**, « recette manuelle », « tests manuels », « je dois tester » après une feature livrée.
- L'utilisateur nomme une feature `DONE-*.md`, ou le dossier d'un chantier, en demandant comment la tester à la main.
- Proposée par le Build après la livraison (`workflow-kit/core/phase-realisation.md` § « Recette post-livraison »).

## Entrées

- **Feature** : slug ou chemin du `DONE-<slug>.md` (`.agents/feature/**/DONE-<slug>.md`, grep/glob) ; ou **dossier d'un chantier** : tous ses `DONE-*.md`. Absente → demander.
- **Chantier incomplet** : le dossier contient encore un `LOT-*.md` ou une feature sans préfixe de clôture → le signaler et demander s'il faut recetter les seuls lots livrés.

## Fiche et branche de recette

- **Fiche** : un fichier à part, **jamais** une section ajoutée au `DONE` (il appartient à la branche de la feature et à sa compaction) :
  - chantier : `RECETTE.md` à la racine de son dossier ;
  - feature isolée : `RECETTE-<slug>.md` à côté de son `DONE-<slug>.md`.
- **Branche** : `recette/<feature>`, créée depuis la branche de la feature. Elle porte le seeder, la fiche et ses constats, et **n'est jamais fusionnée** vers la production. Une correction de la feature y arrive par une fusion de la branche de la feature dans la branche de recette.
- **Fin de vie** : une fois la feature en production, supprimer la branche (locale et distante), **sur accord de l'utilisateur**. Seeder, fiche et constats disparaissent avec elle ; restent le dossier de livraison de la recette jouée (hors dépôt) et l'historique de la feature.
- **Ancien format** : une section `## Recette manuelle` dans un `DONE` (fiches antérieures) reste lisible ; ne pas la déplacer.

## Garde-fous

1. **Jamais en production/staging.** Vérifier `APP_ENV=local` avant tout `db:seed`. Si ce n'est pas `local` → **refuser et alerter**.
2. **Aucune migration existante modifiée**, **aucun code métier touché** : la recette vérifie le livrable, elle ne le corrige pas.
3. Le seeder de recette est **jetable** : jamais ajouté à `DatabaseSeeder`, jamais référencé par un autre seeder, commité sur la branche de recette seulement.
4. La fiche de recette est **en langage métier** : pas de nom de classe/méthode/fichier/colonne. Parler écrans, boutons, documents, statuts.
5. Ne jamais lancer `migrate:fresh` (interdit) : le seeder doit être **isolé et idempotent**.

## Workflow

### Étape 1 — Analyser les DONE

Lire chaque `DONE-*.md` du périmètre (version de travail ou compactée, cf. skill `compacter-feature`) :
- `## Résumé métier` (le problème et les effets visibles) ;
- scénarios **baseline** et **évolution** (GWT étape 1), avec leur introduction et `## Clé de lecture des scénarios` si présente (vocabulaire, jeu de données commun) ;
- `## Edge cases identifiés` (fichier compacté : `## Dette connue` + ligne « Couverts ») ;
- `## Décisions & Justifications (ADR)` et, si présentes, `## Leçons de réalisation` / `## Vigilances` ;
- règles métier `SP-*` : identifiants dans `## Nuances consignées` (fichier compacté : `## Traçabilité`), **texte** dans `.agents/specs/spec-parallele.md`.

Compléter par les changements livrés pour cerner le visible :

```bash
git log --oneline -10 -- <fichiers de la feature>
git show --stat <commit>
```

Se concentrer sur ce que **l'utilisateur voit** (écrans, boutons, statuts, messages).

### Étape 2 — Dériver les scénarios de recette

Traduire les GWT techniques en **parcours utilisateur**, regroupés par parcours (`A`, `B`… : un parcours = un enchaînement qui se joue d'un trait), au format de la fiche (étape 6). Couvrir : le **nominal**, l'**erreur**, les **cas limites** (edge cases), la **non-régression** (baseline). Chaque scénario dit ce qu'il couvre (`*Couvre : <scénarios ou règles>*`). Ce qui ne se recette pas à la main (paiement réel, changement d'heure…) va dans `## Non couverts à la main`, avec ce qui le garde.

### Étape 3 — Décider si un seeder est nécessaire

- Si l'état est atteignable **via l'UI** → **pas de seeder**, le dire.
- Sinon → produire un seeder jetable (étape 4).

### Étape 4 — Créer le seeder jetable

Fichier : `database/seeders/Recette/Recette<Slug>Seeder.php` (namespace `Database\Seeders\Recette`).
Invocation : `php artisan db:seed --class="Database\Seeders\Recette\Recette<Slug>Seeder"` (fallback Docker : `docker compose exec -T app php artisan db:seed --class="..."`).

Règles :
- **Bandeau** en tête de classe :
  ```php
  // ⚠️ Seeder de recette — US <slug> — JETABLE (supprimable après recette).
  ```
- **Isolé** : ne créer que des **données explicitement rattachées au scénario**, préfixées `RECETTE-` (ou via un identifiant/marqueur dédié du projet). Ne jamais toucher aux données existantes.
- **Idempotent** : avant re-création, purger **uniquement** les données de recette (ses propres marqueurs) et recréer, dans une transaction.
- **Cohérent** : passer par les **services/Actions métier** quand l'état visé doit être cohérent. Écrire des lignes brutes **uniquement** si le scénario cible justement une donnée incohérente.
- **Garde local-only** en tête de `run()` :
  ```php
  if (! app()->environment('local')) {
      throw new RuntimeException('Seeder de recette : interdit hors environnement local.');
  }
  ```
- **Rapporter** à la fin : les identifiants utiles à la recette.

Tous les objets doivent être créés **par le seeder** (pas de dépendance à des données préexistantes non contrôlées).

### Étape 5 — Exécuter le seeder en local

```bash
php artisan db:seed --class="Database\Seeders\Recette\Recette<Slug>Seeder"
```

Rapporter : statut, objets créés, identifiants de connexion, URL.

### Étape 6 — Écrire la fiche de recette

Sur la branche `recette/<feature>` (la créer depuis la branche de la feature si besoin), écrire `RECETTE.md` (chantier) ou `RECETTE-<slug>.md` (feature isolée) :

```markdown
# Recette manuelle — <feature> (<lots couverts, s'il y en a>)

> Fichier de recette (branche `recette/<feature>`), supprimé avec la branche une fois la feature en production.
> Seeder : `php artisan db:seed --class="Database\Seeders\Recette\Recette<Slug>Seeder"` (jetable)
> URL : <APP_URL> | Connexion : <comptes de recette, par rôle>
> Emails : <boîte mail de développement> | Durée : <estimation>

## Données de départ
- <état de données créé par le seeder, en langage métier>

## Parcours A — <intitulé>

### Scénario A1 — <titre>
- **Étant donné** : …
- **Quand je** : …
- **Alors je dois voir** : …
- *Couvre : <scénarios ou règles>*

## Non couverts à la main
- <ce qui ne se recette pas à la main, et ce qui le garde>

## Constats

Rempli au passage (à la main, ou par la skill `recette-navigateur`).

| Scénario | Résultat (OK / KO) | Remarque |
|---|---|---|
| A1 | | |
```

### Étape 7 — Commiter et passer la main

- Commiter seeder et fiche sur la branche de recette (jamais sur la branche de la feature), sur accord de l'utilisateur.
- Rapporter : branche, fiche, seeder exécuté (identifiants, comptes, URL).
- Proposer la suite : jouer la recette à la main en remplissant `## Constats`, ou la faire jouer par l'agent (`/recette-navigateur <feature>` : captures, constats, PDF de recette pour le client).

## Contexte local (rappel)

- `APP_ENV=local`, `APP_URL` défini dans `.env`.
- Si `php` n'est pas accessible → fallback Docker (`docker compose exec -T app php artisan ...`).
- `migrate:fresh` et `db:wipe` sont à éviter : ne pas s'appuyer sur un reset.

## Squelette minimal de seeder

```php
<?php

namespace Database\Seeders\Recette;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use RuntimeException;

// ⚠️ Seeder de recette — US <slug> — JETABLE (supprimable après recette).
class Recette<Slug>Seeder extends Seeder
{
    public function run(): void
    {
        if (! app()->environment('local')) {
            throw new RuntimeException('Seeder de recette : interdit hors environnement local.');
        }

        DB::transaction(function () {
            // 1. (idempotence) purger les données de recette (marqueurs RECETTE-<slug>).
            // 2. créer les objets du scénario via les services/Actions métier.
            // 3. $this->command?->info(...) : résumé des IDs créés.
        });
    }
}
```
