---
name: "retouche"
description: "Petite modification hors workflow (ni fichier de feature, ni GWT, ni sous-agents), menée par l'agent principal seul : usages d'abord, test qui sait échouer, tests existants jamais modifiés en silence, périmètre strict, rapport de trois lignes. Use only when the user types « /retouche » or explicitly asks to handle a change as a retouche; never choose it on your own for a change request."
---

# retouche

Petite modification menée par l'agent principal seul : pas de fichier de feature, pas de GWT, pas de sous-agents, aucune pause hors des arrêts de la règle 5. C'est l'utilisateur qui décide qu'il s'agit d'une retouche ; la règle 5 revérifie en cours de route et arrête ce qui n'en est pas une.

## Départ

- `git status --short` : noter les fichiers déjà modifiés. Ils ne sont pas à toi : tu ne les touches pas et ils n'iront pas dans le commit.
- `workflow-kit/core/qualite-code.md` introuvable (worktree non préparé) : le dire à l'utilisateur avant de commencer.
- Fichiers meta (`.agents/reference-utilitaires.md`, `.agents/specs/spec-parallele.md`, `.agents/domain-glossary.md`, fichiers-rôles) : jamais écrits ici, seulement signalés dans le rapport.

## Règles, par ordre d'importance

### 1. Les usages d'abord

Avant de modifier une méthode, un composant, une vue ou un libellé existant, chercher ses usages (recherche textuelle dans le code, les vues et les gabarits). Chaque usage concerné par la demande est traité ; les tests qui couvrent ces usages sont lancés à la fin.

- Libellé ou nom visible renommé : chercher aussi dans `.agents/` (glossaire, spec parallèle, fichiers-rôles) et signaler les occurrences.
- Une recherche textuelle ne voit pas les appels résolus dynamiquement (nom de méthode construit, événement) : le dire dans le rapport quand le code en contient.

### 2. Un test qui sait échouer

- **Comportement observable** (ce qui est calculé, enregistré, refusé, affiché sous condition) : le test d'abord, au niveau où le comportement s'observe, lancé avant le code. Il doit échouer **sur une assertion**, pas sur une erreur (classe introuvable, syntaxe) : garder l'extrait de sortie. Puis le code minimal qui le fait passer.
- **Bug** : un test qui le reproduit, en échec avant la correction.
- **Rien d'observable** (libellé, mise en forme) : pas de test ; le rapport dit où regarder.
- Avant d'écrire un test : procédure anti-doublon et règles d'écriture de `.agents/test-rules.md`. Couverture déjà présente : pas de nouveau test.

### 3. Tests existants : rien en silence

Un test existant qui échoue signale une régression (corriger le code) ou un changement voulu par la demande. Jamais de modification d'un test existant pour le seul faire repasser au vert. Toute assertion existante modifiée ou retirée est recopiée, avant et après, dans le rapport.

### 4. Le périmètre, rien que le périmètre

- Ne modifier que ce que la demande exige.
- Critères de `workflow-kit/core/qualite-code.md` (réutilisation comprise), appliqués au seul code écrit ou modifié.
- Ce qui est remarqué en passant hors périmètre (duplication voisine, bug ailleurs) va dans le rapport, pas dans le diff.

### 5. Arrêts

Dire ce qui arrête et proposer `/raffiner` ; l'utilisateur décide de continuer ici ou non :

- une migration de schéma est nécessaire ;
- la demande laisse un choix de comportement à trancher (règle métier, cas non prévu) : ne pas le trancher seul.

## Fin

1. **Tests** (avant tout run : `.agents/skills/tests/SKILL.md`) : les tests ciblés de la zone et des usages repérés, puis le test global ; formatage des fichiers modifiés. Commandes : `.agents/workflow-commands.md`.
2. **Relire `git diff` en entier**, pas sa mémoire de ce qui a été écrit : fichiers hors périmètre, restes de débogage, code commenté.
3. **Rapport**, trois lignes, `aucun` quand c'est vide :
   - **Preuves** : extrait de l'échec, puis succès des tests ciblés et du global ; ou « rien d'observable : regarder <écran, action> ».
   - **Usages vérifiés** : usages trouvés, et ceux modifiés.
   - **À signaler** : assertions existantes modifiées (avant/après), occurrences dans `.agents/`, nouvel utilitaire à référencer (proposé, pas écrit), ce qui a été vu en passant.
4. **Commit**, sur accord de l'utilisateur : les seuls fichiers de la retouche, pas ceux notés au départ. Le corps du message dit pourquoi (contexte, problème, comportement obtenu) : sans fichier de feature, c'est la seule trace.
