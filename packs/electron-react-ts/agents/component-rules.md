# Conventions composants (React)

> **Statut : DÉFAUT PACK** — conventions composants/exports ; le projet spécialise si besoin.

## Structure

- Un composant par fichier, `PascalCase.tsx`, export par défaut du composant.
- Types de props explicites (`interface XxxProps`).
- Logique dérivée → `useMemo` (jamais `useEffect` pour un calcul dérivable).

## Règles React

- **Pas d'index de tableau comme `key`** : utiliser un ID stable et unique.
- État global réservé aux données partagées (listes, session) via Context ; le reste en `useState` local.
- Les contextes/providers ne consomment que les providers parents.
- Pas de logique métier dans les composants : déléguer aux facades / hooks.

## Hooks

- Hooks UI dans `hooks/` (ex. `useResizable`, `useSlider`).
- Un hook = une responsabilité ; nommage `useXxx`.

## Accessibilité

- Éléments interactifs = vrais boutons/liens ; gérer le focus clavier.
- Les raccourcis clavier documentés vivent au niveau du composant concerné.
