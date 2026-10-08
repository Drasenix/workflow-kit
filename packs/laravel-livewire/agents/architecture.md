# Architecture (socle Laravel 12 + Livewire 3)

> Socle **générique** du pack `laravel-livewire`, à ajuster selon le projet réel.
> **Source de vérité** : l'arborescence du projet et `routes/`. Ce document décrit le socle
> attendu ; un dossier ou fichier absent de ce socle n'existe que s'il est créé par le projet.

## Arborescence `app/`

| Dossier | Rôle |
|---|---|
| `app/Actions/` | Unités de logique métier exécutables (1 responsabilité). Préférées pour toute opération non triviale. |
| `app/DTO/` | Data Transfer Objects typés entre couches. |
| `app/Enums/` | Enums PHP 8.1+. |
| `app/Http/Controllers/` | Contrôleurs HTTP (web et API). |
| `app/Http/Requests/` | FormRequests de validation. |
| `app/Jobs/` | Traitements asynchrones (queue). |
| `app/Listeners/` | Réponses aux events Laravel. |
| `app/Livewire/` | Composants UI réactifs, organisés en sous-dossiers par domaine. |
| `app/Models/` | Modèles Eloquent. Voir `.agents/domain-glossary.md` pour la sémantique métier. |
| `app/Providers/` | Service providers. |
| `app/Services/` | Intégrations externes et comportements transverses. |

Sous-dossiers optionnels (créer si besoin) : `app/Contracts/`, `app/Exports/`, `app/Notifications/`, `app/Traits/`.

## Routing

| Fichier | Rôle |
|---|---|
| `routes/web.php` | Routes web : pages Blade, composants Livewire, auth. |
| `routes/api.php` | Routes API. **Opt-in** : à activer dans `bootstrap/app.php` si le projet expose une API. |
| `routes/console.php` | Commandes artisan et scheduling. |

## Couches et flux

### Requête web → composant Livewire
1. Route web → page Blade (layout + `@livewire(...)` ou composant pleine page).
2. Le composant `app/Livewire/<Domaine>/` appelle une **Action** ou un **Service** pour la logique.
3. Re-render partiel via `wire:model`, `#[On]`, `#[Computed]`.

### Requête HTTP classique
1. Route → contrôleur `app/Http/Controllers/`.
2. **FormRequest** pour la validation (si la forme est non triviale).
3. **Action** ou **Service** pour la logique métier.
4. Retour d'une vue ou d'une réponse JSON.

## Persistance (socle)

- **Queue / Cache / Session** : driver `database` par défaut (tables `jobs`, `cache`, `sessions`).
- Adapter selon `.env` et `config/` du projet.
