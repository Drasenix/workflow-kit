---
description: Répond à une question métier (spec officielle / spec parallèle SP-* / glossaire)
---

Invoque le sous-agent `doc` (outil `Task`, `subagent_type: doc`) pour répondre à la question métier suivante. Le sous-agent applique son protocole : lecture seule, réponse sourcée en **deux blocs** (spec officielle / ajouts `SP-*`).

Question : $ARGUMENTS

Si aucune question n'est fournie, demande-la avant d'invoquer le sous-agent.
