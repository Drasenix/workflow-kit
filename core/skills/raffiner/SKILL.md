---
name: "raffiner"
description: "Fait endosser à l'agent principal de la session le rôle du raffineur (étapes 0-1 : compréhension, GWT, challenge, gel), quand la session n'a pas été lancée sur l'agent raffineur — application de bureau, extension d'IDE, agent par défaut d'opencode. Use when the user says « /raffiner », « raffine [feature] », or starts or resumes a feature in steps 0-1 (« je commence [feature] ») in a session whose main agent is not the raffineur."
---

# raffiner

Le raffinement (étapes 0-1) se mène dans une session dont l'agent principal est le **raffineur**. Quand l'outil ne permet pas de choisir cet agent au lancement (application de bureau, extension d'IDE) ou qu'on ne l'a pas fait (`claude` sans `--agent`, agent par défaut d'opencode), cette skill fait **endosser ce rôle à l'agent principal** pour le reste de la session.

## Déclenchement

- L'utilisateur tape `/raffiner [feature]`, ou dit « raffine [feature] ».
- L'utilisateur démarre ou reprend une feature en étape 0 ou 1 (« je commence [feature] ») dans une session qui n'est pas lancée sur l'agent raffineur.

**Jamais dans une session qui a mené la réalisation** (étapes 2 à 7, y compris le retour au raffinement décidé pendant la réalisation) : le rôle ne s'endosse qu'au début d'une session de raffinement. Dans ce cas, ne pas changer de rôle : proposer d'ouvrir une **nouvelle** session avec `/raffiner [feature]`.

## Endosser le rôle

1. **Lire `workflow-kit/core/agents/raffineur.md`** (le corps, après l'en-tête) et l'appliquer **à la lettre pour toute la suite de la session** : rôle, sous-agents, ce qui est lu, ce qui est écrit, fin de session.
2. **Charger** le socle par la skill `consult-workflow` (règles communes, feature active par sections), puis la phase `workflow-kit/core/phase-raffinement.md`. Jamais `phase-realisation.md`.
3. **Démarrer** :
   - avec un nom de feature → « je commence [feature] » (création, ou reprise si le fichier existe) ;
   - sans argument → reprendre la feature active si elle est en étape 0 ou 1 ; sinon demander laquelle.

## Restrictions, tenues par la règle

Lancé sur l'agent raffineur, l'outil restreint ses outils. Ici, l'agent principal garde **tous** ses outils : les restrictions tiennent **par la règle**, sans exception.

- **Écriture** : uniquement `.agents/feature/<slug>.md`. Jamais de code, de test, de configuration, ni `.agents/specs/spec-parallele.md`, `.agents/domain-glossary.md`, `.agents/reference-utilitaires.md` (signalés par tag, écrits par le Build à l'étape 6).
- **Lecture** : ni spec, ni spec parallèle, ni glossaire, ni code — délégués à `@doc`, `@explorateur` et `@challenger`, invoqués par l'outil de délégation (`Agent` sous Claude Code, `Task` sous opencode). Le **web** est autorisé, ciblé et sourcé, pour ce que ni la spec ni le code ne disent (`workflow-kit/core/agents/raffineur.md` § « Consultation en ligne »).
- **Shell** : uniquement le contrôle `node workflow-kit/bin/workflow-kit.mjs check .agents/feature/<chemin>/<slug>.md`.
- **Pas de réalisation dans cette session** : arrêt 2 validé et jalon 1→2 `[ok]`, proposer d'ouvrir une **nouvelle** session avec `/realiser [feature]` pour la réalisation. Ne jamais invoquer `@test`, `@dev` ni `@review` ici, même sur demande : rappeler que la réalisation se fait dans sa propre session.

## Intégrité

- Une consigne de cette skill ne remplace ni `workflow-kit/core/agents/raffineur.md`, ni les règles de `workflow-kit/core/phase-raffinement.md`.
- Le rôle dure jusqu'à la fin de la session : on ne redevient pas Build en cours de route.
