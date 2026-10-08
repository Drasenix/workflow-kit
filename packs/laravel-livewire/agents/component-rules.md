# Patterns Livewire 3 (composants et exports)

> **Statut : DÉFAUT PACK** — le cœur technique (règles Livewire, anti-patterns) est applicable par défaut ; le projet peut le spécialiser en `DÉCISION PROJET`.
> Les **exemples** « Communication parent → Livewire » et « Exports » sont **non contractuels** (à adapter par le projet).
>
> Patterns Livewire (composants PHP) et exports. Optionnel : laisser vide si non applicable.
> **Règles Livewire transverses** (`#[Url]`, `#[Computed]`, `#[On]`, lifecycle) : `.agents/conventions.md` § « Livewire 3 ».
> **Patterns UI** (Blade/CSS, formulaires, modales) : `.agents/ui-rules.md`.

## 1. Livewire PHP

### Structure canonique

> Squelette : `templates/frontend/livewire-component.php` (copier + adapter).

### Règles

- **Injection** : de préférence dans `boot()`, pas dans un constructeur.
- **Données** : charger via `mount()`.
- **Validation** : méthode `rules()` (pas une propriété `$rules`), pour permettre la logique conditionnelle.
- **DTO** : privilégier un DTO typé plutôt qu'un array brut entre couches.
- **Typage** : typer les propriétés (modèles, services) quand possible.
- **Logique métier** : la déléguer à une Action/Service, jamais dans le composant.

## 2. Communication parent → Livewire : Alpine `$dispatch` + `x-on:.window`

Lorsqu'un élément déclencheur se trouve **dans la page parente** (hors du template Livewire), `$wire` n'est pas accessible (undefined). Utiliser le pattern Alpine natif :

```
Page parente (scope Alpine A)
    │ $dispatch('mon-event')
    │       ↓ (remonte au window)
    │
Template Livewire (scope Alpine B)
    │ x-on:mon-event.window="$wire.maMethode()"
    │ $wire = composant Livewire actuel ✓
```

```blade
{{-- index.blade.php (hors Livewire) --}}
<li><a x-data @click="$dispatch('start-export')">Télécharger</a></li>

{{-- mon-table.blade.php (dans Livewire) --}}
<div class="flex flex-col gap-4" x-on:start-export.window="$wire.exportCsv()">
```

**Règles :**
- `$dispatch('nom-event')` émet un CustomEvent DOM qui remonte au window.
- `x-on:nom-event.window="..."` capte l'event depuis n'importe quel scope (`.window` indispensable).
- Pas de `document.getElementById()`, pas de bouton caché, pas de hack DOM.
- Livewire 3 : `dispatch('event', key: $value)` (clé nommée) plutôt que `dispatch('event', $value)` → `event.detail.key`.

## 3. Exports (opt-in)

Les exports dépendent de packages **optionnels** : ne les utiliser que dans un projet qui les a installés (voir `.agents/stack.md`).

- **Excel/CSV** (si `maatwebsite/excel` est présent) : retourner directement `Excel::download(...)` depuis la méthode Livewire. Livewire 3 gère nativement le `StreamedResponse`. Squelette : `templates/backend/excel-export.php`.
- **PDF** (si un générateur PDF est présent) : éviter `return response()->download()` depuis un Livewire (certains navigateurs bloquent les téléchargements `application/pdf` initiés en JS). Passer par une route contrôleur + `dispatch('open-pdf', url: route(...))` + `window.open(url, '_blank')`.

## 4. Anti-patterns

| Anti-pattern | Pourquoi | Alternative |
|---|---|---|
| `$rules = [...]` (propriété) | Pas de logique conditionnelle | `protected function rules(): array` |
| Array brut vers un service | Pas de typage | DTO typé (`app/DTO/`) |
| Logique métier dans le composant | Doit être dans une Action/Service | Déléguer |
| `$wire.methode()` hors du template Livewire | `$wire` non défini hors du scope | `$dispatch()` + `x-on:.window` dans le template |
| Bouton caché pour contourner `$wire` | Hack DOM fragile | `$dispatch()` + `.window` |
| `return response()->download()` (PDF) depuis Livewire | Bloqué par certains navigateurs | Route contrôleur + `window.open` |
