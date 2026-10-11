# Conventions UI (Tailwind)

> **Statut : DÉFAUT PACK** — conventions UI techno ; le projet spécialise (thème, composants maison).

- **Tailwind CSS 3** avec thème custom dans `tailwind.config.js` (couleurs : `primary`, `background`, `surface`, `border`, `field`, `text.*`).
- Classes utilitaires privilégiées ; composants réutilisables via `@layer components` dans `App.css`.
- Styles globaux et scrollbar custom dans `App.css` (scrollbar fine, couleur primaire).
- Palette sombre par défaut (fond `background`, cartes `surface`).

## Animations

- Définies en CSS (`@keyframes`) et exposées comme classes utilitaires.
- Transitions courtes (150 ms) pour les états interactifs (hover, active).

## Règles

- Pas de style inline complexe : préférer des classes Tailwind ou des classes de composant.
- Garder la cohérence avec les tokens du thème (jamais de couleur hex en dur dans le JSX).
