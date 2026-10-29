# Feature Workflow (checkpoints obligatoires)

Chaque feature suit **exactement** cette séquence, dans l'ordre, sans saut d'étape.
Quand une pause est obligatoire, et le régime des auto-gates (2, 4) : § « Pauses & anti-chaînage ». Qui lit quoi : `workflow-kit/core/index.md`.

Ce fichier porte les règles **communes** aux deux phases. Les règles propres à chaque phase sont chargées par son point d'entrée, chacune dans sa session (le socle commun par la skill `consult-workflow`) :
- **Raffinement** (étapes 0-1) : `workflow-kit/core/phase-raffinement.md` — skill `raffiner` (`/raffiner [feature]`)
- **Réalisation** (étapes 2-7) : `workflow-kit/core/phase-realisation.md` — skill `realiser` (`/realiser [feature]`)

## Étapes

| # | Étape | Agent | Livrable | Pause | Phase |
|---|---|---|---|---|---|
| 0 | **Compréhension** | raffineur (+ `@doc`, `@explorateur`) | Synthèse spec / spec parallèle / code actuel + questions sourcées (`## Questions specs`), références (`## Specs consultées`) et faits du code (`## Contexte technique`) dans `.agents/feature/<slug>.md` | **OUI** (arrêt 1) | Raffinement |
| 1 | **Given/When/Then + challenge** | raffineur (+ `@challenger`) | Scénarios baseline + évolution (+ `## Clé de lecture des scénarios` si besoin) + edge cases sourcés (`## Edge cases identifiés`) + écarts arbitrés (`## Arbitrages du challenge`) dans `.agents/feature/<slug>.md` | **OUI** (arrêt 2) | Raffinement |
| 2 | **Test ROUGE** | `@test` | Tests qui échouent (baseline + évolution), **fichier unique** `<Feature>Test.*` (sans identifiant de lot) | **Auto (jalon 2→3)** | Réalisation |
| 3 | **Plan** | `@dev` | `## Plan (étape 3)` : arbre de flux (prompt, et dans le fichier sous `### Arbre de flux`), fichiers, code réutilisé, choix structurants, signatures publiques | **OUI** | Réalisation |
| 4 | **Développement VERT** | `@dev` (repris ou réinvoqué) | Code minimal qui fait passer les tests, écarts au plan déclarés | **Auto (jalon 4→5)** | Réalisation |
| 5 | **Revue qualité** | `@review` | Checklist code mort/duplication/réutilisation/simplicité + plan de refacto optionnel | **OUI** | Réalisation |
| 6 | **Résumé métier + recette nuances** | Build | Résumé non technique dans `.agents/feature/<slug>.md` sous `## Résumé métier` **+** `## Nuances consignées` (entrées `SP-*` créées/superseded) → écriture dans `.agents/specs/spec-parallele.md` après validation | **OUI** | Réalisation |
| 7 | **Passage DONE (mécanique)** | Build | Renommage `.agents/feature/<slug>.md` → `DONE-<slug>.md` + ligne 7 → OK dans le tableau Progression | **Auto (jalon 6→7)** | Réalisation |
| X | **Backtrack** | Build | Sur demande utilisateur, reprise à l'étape indiquée | | Les deux |

> **Après le commit de livraison (hors étapes)** : le Build propose la compaction du fichier clos (skill `compacter-feature`) : garde l'apprentissage, retire le pilotage. Garde-fous : `workflow-kit/core/phase-realisation.md` § « Compaction post-livraison ».

## Orchestration par subagents

Les étapes 0-1 sont menées par le **raffineur**, agent principal d'une session dédiée, qui délègue la lecture à `@doc`, `@explorateur` et `@challenger` (`workflow-kit/core/phase-raffinement.md`) ; dans cette session, les règles ci-dessous qui désignent le Build s'appliquent au raffineur. Les étapes 2 à 7 sont orchestrées par le **Build** de la session de réalisation : chaque étape est déléguée au subagent de la table « Étapes » (rôles et lectures : `workflow-kit/core/index.md`). Le Build :
1. Consulte `.agents/templates-index.md` pour choisir les templates adaptés
2. Crée `.agents/feature/<slug>.md` au début de la feature à partir de `workflow-kit/core/templates/feature.md`
3. **Met à jour le tableau `## Progression`** avant et après chaque étape (`🔄 en cours`, puis `OK YYYY-MM-DD` ou `sauté` justifié)
4. Invoque chaque subagent via l'outil de délégation, en lui indiquant les **sections de `.agents/feature/<slug>.md`** à lire (cf. `workflow-kit/core/index.md`, colonne « Sections ») — jamais « lis le fichier »
5. **Fait une pause après les étapes à décision sémantique (0, 1, 3, 5, 6)** ; auto-gates 2/4 selon le jalon : § « Pauses & anti-chaînage »
6. Relit les sections produites par le subagent avant de passer au suivant
7. **Ne lance le test global que** dans les conditions de `workflow-kit/core/phase-realisation.md` § « Test global »

**Dépendances :** le raffineur → GWT (avec `@doc`, `@explorateur`, `@challenger`) ; `@test` lit les GWT ; `@dev` lit les GWT et les tests pour le plan, puis le plan pour le code ; `@review` lit le code et les GWT. Les subagents ne s'invoquent pas entre eux : seul l'agent principal de la session (raffineur ou Build) orchestre.

## Règles dures

- Si une étape révèle une incohérence métier, **revenir à l'étape 0 ou 1** : pas de correctif en cours de route.
- Le GWT dans `.agents/feature/<slug>.md` est la **source de vérité** du contrat. Le test en est une traduction 1:1.
- Si `@review` détecte un problème, l'utilisateur peut demander un retour à l'étape 4 (ou autre) ; plan de refacto non vide → `workflow-kit/core/phase-realisation.md` § « Refacto via backtrack 4→5 ».
- **Primauté du spec parallèle** et **aucune règle métier durable ne passe DONE sans être consignée** : `workflow-kit/core/agent-build.md` § Spec parallèle.

## Pauses & anti-chaînage

### Quand s'arrêter

- **Étapes à décision sémantique (0, 1, 3, 5, 6)** : pause obligatoire : le livrable est présenté, puis l'agent attend un go explicite ("go", "ok", "oui", "continue") avant l'étape suivante.
- **Étapes mécaniques (2 et 4), auto-gates** : enchaînement automatique **si** le jalon Build correspondant est OK (jalons 2→3 et 4→5, `workflow-kit/core/phase-realisation.md` § « Jalons et pauses de la réalisation »).
- **Toute anomalie détectée par un jalon → pause utilisateur immédiate** (baseline rouge, évolution verte avant implémentation, tests rouges après dev, écart majeur au plan).

### Règle ABSOLUE : anti-chaînage

**Ne JAMAIS enchaîner deux étapes à décision sémantique dans le même tour.** Les seuls enchaînements autorisés sont les auto-gates (2→3 et 4→5) quand le jalon correspondant est OK.

- Une étape de réalisation (2 à 5) = un subagent invoqué via l'outil de délégation (`Task` / `Agent`) ; les étapes 0-1 sont menées par le raffineur, les étapes 6-7 par le Build
- Si le jalon détecte une anomalie → **STOP**, pause utilisateur
- Même si le livrable semble parfait, ne pas franchir une pause sémantique sans go

**Exemples interdits :**
- Le raffineur termine l'étape 1 → enchaîner directement sur @test étape 2 (arrêt 2, puis session de réalisation)
- L'agent @test termine l'étape 2 avec un jalon 2→3 en échec (ex : baseline rouge) → enchaîner sur le plan de @dev (pause obligatoire)
- Proposer du code correctif dans le même message que la revue

**Sanction :** si l'utilisateur reprend un enchaînement non autorisé, revenir immédiatement à l'étape précédente, annuler toute action non demandée, et attendre le go.

### Comportement pendant la pause

- L'agent présente le livrable de l'étape et s'arrête ; il ne passe pas à l'étape suivante tant qu'il n'a pas reçu une réponse (validation, rejet, ou question).
- **Signalements meta à présenter à chaque pause** : puces **métier** `[À CONSIGNER]` / `[AMENDE SP-*]` et puces `[À VALIDER]`, arbitrées une à une. Les signalements **techniques** (puces de `### Nouveaux utilitaires à référencer`, fichiers-rôles, références mortes) sont tracés dès qu'ils apparaissent (`## Conventions (fichiers-rôles)`, puces) mais tranchés **une seule fois**, à la pause 5, par le récapitulatif `### Décisions techniques` (`workflow-kit/core/phase-realisation.md` § « Pause 5 »). Rien n'est laissé « pour plus tard » sans trace écrite.
- Si l'utilisateur dit **"stop"** ou **"pause"** → l'agent interrompt immédiatement toute action en cours.

### Règle ABSOLUE : le Registre d'abord

**Toute parole de l'utilisateur qui change le cours** — réponse à une pause, mais aussi correction en cours d'étape (« non, garde X »), « go refacto », retour à une étape, accord ou refus d'une mise à jour meta — donne **d'abord** une ligne au `## Registre des décisions` (identifiant, décision en une phrase, date), **puis** l'action. La colonne « Consigné dans » (ADR-n, `SP-*`, scénario, fichier-rôle) se complète au plus tard à l'étape 6. Section absente (fichier antérieur au gabarit) : la créer après `## Progression`.

Dans la même écriture, le Build répercute la décision sur sa trace :
- utilitaire accepté → ligne `.agents/reference-utilitaires.md` dans `## Conventions (fichiers-rôles)` (⬜, écrite au plus tard à l'étape 6) et puce marquée `→ ✅ référencé` ; refusé → `→ ⛔ <raison>` ;
- fichier-rôle `.agents/*.md`, `.agents/domain-glossary.md` ou référence morte à corriger → ligne ⬜ dans `## Conventions (fichiers-rôles)` ;
- `[À VALIDER]` tranché → `→ ✅` ou `→ ⛔` sur la puce.

### Règle ABSOLUE : incohérence de Progression → pause

Le tableau `## Progression` sert de diagnostic rapide. Avant de passer à l'étape N+1, le vérifier :

- Si une étape est OK sans que l'étape précédente soit OK ou sautée → **pause utilisateur**
- Si une étape a été sautée sans justification dans le fichier → **pause utilisateur**
- Si l'étape 2, 3, 4, ou 5 est cochée alors que l'étape 0 ou 1 est vide → **pause utilisateur**
- Si un test baseline est rouge après implémentation → **pause utilisateur** (régression)
- Si un test évolution est vert avant implémentation → **pause utilisateur** (code déjà existant ou test mal écrit) ; en backtrack tardif, seuls les scénarios ajoutés ou modifiés sont concernés (cf. « Protocole de backtrack »)

**Comportement attendu :** dans chaque cas, EXPLIQUER l'incohérence à l'utilisateur, NE PAS continuer l'étape suivante sans réponse explicite. Le mot "continue", "go", "ok" ou "oui" doit apparaître dans sa réponse.

## Checklist Build : validation entre étapes

Jalons propres à chaque phase : jalon 1→2 → `workflow-kit/core/phase-raffinement.md` § « Jalon 1→2 » ; jalons 2→3 à 6→7 et pauses 3 et 5 → `workflow-kit/core/phase-realisation.md` § « Jalons et pauses de la réalisation ».

### Points communs (toutes les transitions)

- [ ] Le livrable du subagent est présent dans `.agents/feature/<slug>.md`
- [ ] Les sections obligatoires du template sont remplies (pas de squelette vide, pas de `<!-- -->`)
- [ ] Aucun `[À VALIDER]` non tranché ne subsiste ; `## Ambiguïtés à valider` sans case `- [ ]` ouverte — sinon **pause utilisateur**
- [ ] Si un point échoue → **ne pas passer à l'étape suivante**, demander clarification ou correction au subagent

## Protocole de backtrack (étape X)

Quand l'utilisateur dit "retour étape N" (ou équivalent) :

1. L'agent principal demande confirmation : "Reprendre à l'étape N : les étapes suivantes seront ré-exécutées. Confirmer ?"
2. Sur confirmation, le Build inscrit le backtrack au `## Registre des décisions` **puis** passe les lignes N à 7 du tableau `## Progression` à `🔁 à refaire` (une ligne restée OK au-delà de N fausserait le diagnostic et déclencherait à tort la règle « incohérence de Progression »)
3. L'étape N est ré-exécutée avec le subagent correspondant, avec en consigne les **éléments ajoutés ou modifiés** (scénarios, plan) — pas « refais tout »
4. Les étapes ultérieures sont refaites dans l'ordre (N+1, N+2…)
5. Chaque étape refaite respecte le protocole de pause
6. Après le passage en 🔁, le Build lance le contrôle de livraison (skill `controle-livraison` (`workflow-kit/core/skills/controle-livraison/SKILL.md`)) : la partie structurelle (Progression cohérente, backtrack inscrit au Registre) doit être verte avant de réinvoquer le subagent

Un backtrack qui fait changer de phase (retour à l'étape 0 ou 1 depuis la réalisation) se poursuit dans une **nouvelle** session de la phase reprise (`/raffiner [feature]`), puis la réalisation reprend dans une nouvelle session (`/realiser [feature]`).

**Backtrack tardif (code déjà écrit).** Quand l'étape 4 a déjà tourné, le rouge attendu au jalon 2→3 ne porte que sur les scénarios **ajoutés ou modifiés** par le backtrack : les autres scénarios d'évolution restent **verts** (ils couvrent du code existant). Un scénario ajouté ou modifié vert avant la reprise de l'étape 4 reste une anomalie (pause) ; un scénario non touché qui passe au rouge est une régression (pause).

**Backtrack limité** : si les étapes suivantes supposent déjà le résultat de l'étape reprise (ex. renforcer une assertion que le plan présume déjà), le Build peut proposer de ne refaire **que** cette étape. Il le dit explicitement dans la demande de confirmation, l'utilisateur confirme, et la décision est tracée par un ADR ; les lignes non refaites repassent à OK avec la mention `(backtrack limité, ADR-n)`.

**Les signalements meta survivent au backtrack** : une étape refaite ne supprime jamais une puce de `### Nouveaux utilitaires à référencer`, un tag ou une ligne de `## Conventions (fichiers-rôles)` sans la trancher (`→ ⛔ caduc après backtrack`).
