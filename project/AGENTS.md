# <Projet> : Agent Instructions

> Fichier canonique lu par tous les outils IA. `CLAUDE.md` peut être un symlink vers ce fichier.
>
> **Ce document est un index.** Les détails vivent dans `.agents/*.md` et le pack techno. Lire les sous-fichiers à la demande.

## Project

<Description courte : type d'application, périmètre, stack principale.>

→ Stack : **`.agents/stack.md`**

## Quick start

```bash
<installation + lancement>
```

→ Commandes : **`.agents/commands.md`**

## Architecture

<Monolithe / services / frontend, dossiers structurants, routing.>

→ Détails : **`.agents/architecture.md`**

## Conventions

- Logique métier dans **<couche>**, intégrations externes dans **<couche>**, transfert typé dans **<couche>**.
- Jamais de logique métier dans un contrôleur.
- Formatter : **<outil>**. Tests : **<framework>**.

→ Règles : **`.agents/conventions.md`**

## Domain

**Avant de toucher aux modèles métier, lire `.agents/domain-glossary.md`.**

Les règles de comportement / flux / calculs validées hors spec vivent dans `.agents/specs/spec-parallele.md` (entrées `SP-*`) : elles **priment** sur le spec officiel.

En cas d'ambiguïté, **demander à l'utilisateur** plutôt que supposer.

## Règles dures

### Ne jamais
- Modifier une migration existante. Créer une nouvelle migration.
- Mettre de logique métier dans un contrôleur.
- Toucher aux fichiers de config sensibles existants sans accord explicite.
- Committer des secrets.
- Inventer des nuances métier.

### Toujours
- Lancer les tests avant de considérer un changement fini.
- Formater le code après modification.
- Utiliser le fallback documenté si l'outil principal n'est pas accessible localement.
- Protéger les modèles (assignation de masse).
- Envelopper les écritures multiples dans une transaction.
- Charger les relations pour éviter les N+1.
- En fin de conversation, proposer de commit, ou de commit et push.

## Rapport d'avancement client

Quand l'utilisateur demande un « point » destiné à un interlocuteur non technique :

1. **Sourcer depuis git** (`git log`, `git show --stat`, diff si besoin).
2. **Traduire en langage métier** : pas de noms de classes/méthodes/fichiers/colonnes/branches/hash.
3. **Pour chaque correction : contexte → problème → solution.**
4. **Pour une évolution** : besoin puis apport, sans inventer de problème antérieur.
5. **Regrouper par thème métier**, signaler le visible immédiatement.
6. **Ne rien inventer** ; si l'impact n'est pas déductible du code, le dire et demander.
7. **Jamais d'heure ni de tranche horaire** : uniquement la date.

## Aide-mémoire

| Je veux… | Lire |
|---|---|
| Versions / deps | `.agents/stack.md` |
| Arborescence et routing | `.agents/architecture.md` |
| Organiser du nouveau code | `.agents/conventions.md` |
| Retrouver une commande | `.agents/commands.md` |
| Comprendre une entité métier | `.agents/domain-glossary.md` |
| Comprendre un flux / statut / règle | `.agents/specs/README.md` |
| Vérifier une règle `SP-*` | `.agents/specs/spec-parallele.md` |
| Comprendre le workflow de dev | `.opencode/index.md` + `.opencode/agent-workflow.md` |
