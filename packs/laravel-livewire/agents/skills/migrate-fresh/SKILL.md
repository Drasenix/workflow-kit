---
name: "migrate-fresh"
description: "Reset complet de la base dev (DESTRUCTIF — confirmation obligatoire)"
---

# migrate-fresh

Charger cette skill quand l'utilisateur demande un reset complet de la base de développement.

## Command Template

⚠️ **COMMANDE DESTRUCTIVE** — drop toutes les tables puis rejoue les migrations et les seeders.

## Garde-fous obligatoires

1. **Vérifier l'environnement** : lire `.env` et confirmer que `APP_ENV=local`. Si `APP_ENV=production` ou `staging`, **refuser et alerter l'utilisateur**.
2. **Vérifier la base** : cette commande opère sur la DB configurée dans `.env`. Confirmer qu'il s'agit de la base de dev locale. Si c'est une base partagée ou distante, **demander confirmation explicite** avant de continuer.
3. **Demander confirmation** à l'utilisateur avec un message clair du type : « Je vais DROP toutes les tables de la base `<nom>` et rejouer les migrations + seeders. Confirmer ? ».

## Exécution

Une fois confirmé :

```bash
php artisan migrate:fresh --seed
```

Rapporter le résultat (succès, erreurs éventuelles, seeders lancés).

## Interdiction

Ne **jamais** lancer cette commande sans confirmation explicite de l'utilisateur.
