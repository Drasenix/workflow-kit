---
name: "recette"
description: "Recette manuelle post-DONE : analyser une US livrée, dériver les scénarios utilisateur (Étant donné / Quand je / Alors je dois voir), créer un seeder jetable isolé et l'exécuter en local. À charger quand l'utilisateur demande une recette manuelle (/recette, « tests manuels », « je dois tester ») après une US passée en DONE."
---

# recette

Charger cette skill après une **US passée en `DONE-*.md`** pour préparer et dérouler une recette **manuelle** : scénarios orientés utilisateur + seeder jetable exécuté en local.

## Déclenchement

- L'utilisateur dit **`/recette`**, « recette manuelle », « tests manuels », « je dois tester » après une US livrée.
- L'utilisateur nomme une feature `DONE-*.md` en demandant comment la tester à la main.

## Entrées

- **Slug de la feature** (ou chemin du `DONE-<slug>.md`). Si absent → demander.
- Localiser le fichier : `.agents/feature/**/DONE-<slug>.md` (grep/glob).

## Garde-fous

1. **Jamais en production/staging.** Vérifier `APP_ENV=local` avant tout `db:seed`. Si ce n'est pas `local` → **refuser et alerter**.
2. **Aucune migration existante modifiée**, **aucun code métier touché** : la recette vérifie le livrable, elle ne le corrige pas.
3. Le seeder de recette est **jetable** : jamais ajouté à `DatabaseSeeder`, jamais référencé par un autre seeder.
4. La fiche de recette est **en langage métier** : pas de nom de classe/méthode/fichier/colonne. Parler écrans, boutons, documents, statuts.
5. Ne jamais lancer `migrate:fresh` (interdit) : le seeder doit être **isolé et idempotent**.

## Workflow

### Étape 1 — Analyser l'US

Lire le `DONE-<slug>.md` (version de travail ou compactée, cf. skill `compacter-feature`) :
- `## Résumé métier` (le problème et les effets visibles) ;
- scénarios **baseline** et **évolution** (GWT étape 1), avec leur introduction et `## Clé de lecture des scénarios` si présente (vocabulaire, jeu de données commun) ;
- `## Edge cases identifiés` (fichier compacté : `## Dette connue` + ligne « Couverts ») ;
- `## Décisions & Justifications (ADR)` et, si présentes, `## Leçons de réalisation` / `## Vigilances` ;
- règles métier `SP-*` : identifiants dans `## Nuances consignées` (fichier compacté : `## Traçabilité`), **texte** dans `.agents/specs/spec-parallele.md`.

Compléter par les changements livrés pour cerner le visible :

```bash
git log --oneline -10 -- <fichiers de l'US>
git show --stat <commit>
```

Se concentrer sur ce que **l'utilisateur voit** (écrans, boutons, statuts, messages).

### Étape 2 — Dériver les scénarios de recette

Traduire les GWT techniques en **parcours utilisateur**, au format imposé :

```
#### Scénario <n> — <titre métier>
**Contexte (Étant donné)** : état des données et de l'écran.
**Action (Quand je)** : clic/saisie précis (écran + bouton + modale).
**Attendu (Alors je dois voir)** : résultat visible (badge, statut, document, message).
```

Couvrir : le **nominal**, l'**erreur**, les **cas limites** (edge cases), la **non-régression** (baseline).

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

### Étape 6 — Écrire la fiche dans la DONE

Ajouter à la fin du `DONE-<slug>.md` une section :

```markdown
## Recette manuelle

> Seeder : `php artisan db:seed --class="Database\Seeders\Recette\Recette<Slug>Seeder"` (jetable)
> URL : <APP_URL> | Connexion : <compte de recette>

### Pré-requis
- <état de données créé par le seeder, en langage métier>

### Scénario 1 — <titre>
- **Étant donné** : …
- **Quand je** : …
- **Alors je dois voir** : …

### Scénario 2 — …
```

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
