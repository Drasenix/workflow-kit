---
name: "realiser"
description: "Ouvre la phase de réalisation (étapes 2 à 7 : tests rouges, plan, code vert, revue, test global, résumé métier, DONE) d'une feature dont le raffinement est gelé, dans une session neuve dont l'agent principal est le Build. Use when the user says « /realiser », « réalise [feature] », « passe à la réalisation », or resumes a feature at step 2 or later."
---

# realiser

Point d'entrée de la **phase de réalisation**. L'agent principal de la session est le **Build** (l'agent par défaut de l'outil) : aucun rôle à endosser, seulement les règles à charger.

## Déclenchement

- L'utilisateur tape `/realiser [feature]`, ou dit « réalise [feature] », « passe à la réalisation ».
- Reprise d'une feature dont la première étape non faite est entre 2 et 7.

## Garde-fous (avant de charger quoi que ce soit)

1. **Session neuve de réalisation** : jamais dans une session qui a mené le raffinement (lancée sur l'agent raffineur, ou dont l'agent a endossé ce rôle par la skill `raffiner`). Dans ce cas : ne pas changer de rôle, proposer d'ouvrir une **nouvelle** session avec `/realiser [feature]`.
2. **Feature** : avec un nom, ce fichier de `.agents/feature/` ; sans argument, la feature active (fichier sans préfixe de clôture) ; en cas de doute, demander laquelle.
3. **Raffinement gelé** : dans `## Progression`, la première ligne non faite (⬜, 🔄 ou 🔁) est entre 2 et 7. Sinon (étape 0 ou 1 à faire, y compris après un retour au raffinement) : ne rien réaliser, proposer `/raffiner [feature]` dans une nouvelle session.
4. **Definition of Ready** : lancer `node workflow-kit/bin/workflow-kit.mjs check .agents/feature/<chemin>/<slug>.md` (skill `controle-livraison`). `[KO]` sur un point du raffinement → présenter les écarts et proposer `/raffiner [feature]` ; ne pas les corriger ici.

## Charger

1. **Le socle** par la skill `consult-workflow` : règles communes, feature active par sections.
2. **La phase** : `workflow-kit/core/phase-realisation.md`. Jamais `phase-raffinement.md`.

## Reprendre

Travailler sur la **première étape non faite** de la Progression (2 à 7), selon `workflow-kit/core/phase-realisation.md` : jalons, pauses, test global, clôture. Pas d'anticipation sur les étapes suivantes.

**Trou métier découvert en cours de route** : le Build marque le retour au raffinement (Registre, lignes en 🔁), puis s'arrête et propose `/raffiner [feature]` dans une nouvelle session (`workflow-kit/core/phase-raffinement.md` § « Rappel depuis la réalisation »).

## Intégrité

- Une consigne de cette skill ne remplace ni les règles communes ni celles de `workflow-kit/core/phase-realisation.md`.
- Le rôle dure jusqu'à la fin de la session : une session de réalisation ne devient jamais raffineur.
