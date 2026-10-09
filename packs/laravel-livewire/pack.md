# Pack : laravel-livewire

> Seeds **techno** pour une application Laravel 12 + Livewire 3 + PHPUnit + Tailwind/DaisyUI.
> Le contenu de `agents/` est copié vers `.agents/` par `workflow-kit init` / `workflow-kit sync`.
>
> **Neutralité** : ce pack ne contient **aucune** donnée de projet (entité, structure, dépendance
> optionnelle présentée comme acquise). Il décrit la **stack**, pas un métier. Les éléments
> propres au projet vivent dans `.agents/` une fois remplis.

## Contenu

| Fichier (`agents/`) | Rôle |
|---|---|
| `conventions.md` | Langue, organisation de la logique, modèles, Livewire, style, secrets |
| `architecture.md` | Socle d'arborescence `app/`, routing, flux |
| `stack.md` | Socle runtime et dépendances (à ajuster depuis `composer.json`/`package.json`) |
| `commands.md` | Commandes dev / tests / format / fallback |
| `test-rules.md` | Règles PHPUnit (dossiers TU/TI, helpers, config, pièges) |
| `ui-rules.md` | Conventions UI (Blade/CSS, formulaires, modales) |
| `component-rules.md` | Conventions Livewire / exports |
| `templates-index.md` + `templates/**` | Templates de code (DTO, Action, Event, Listener, Livewire, tests…) |
| `skills/tests/SKILL.md` | Skill d'exécution des tests |
| `skills/recette/SKILL.md` | Skill de recette manuelle |
| `skills/migrate-fresh/SKILL.md` | Skill de reset DB dev |
