---
name: "tests"
description: "Exécution des tests PHPUnit : run ciblé (--filter=, fichier), test global --parallel, calibrage --processes, fallback Docker, format de rapport. À charger avant tout `php artisan test`."
---

# tests

Charger cette skill avant de lancer `php artisan test` (ciblé ou global) — pour choisir la bonne commande, le bon calibrage et le bon format de rapport.

## Commandes

```bash
# Ciblé par nom
php artisan test --filter=NomDuTest

# Ciblé par fichier
php artisan test tests/Feature/MaFonctionnaliteTest.php

# Test global parallèle (Build uniquement, fin de workflow)
php artisan test --parallel
```

Config de test (`phpunit.xml`) : SQLite en mémoire, queue `sync`, mail `array`, cache `array`.

## Règles d'exécution

- **Runs ciblés des subagents (`@test`, `@dev`)** — `--filter=`, fichier : **sans** `--parallel` (le parallélisme ciblé provoque des incohérences).
- **Le global, c'est `--parallel`** — réservé au Build, en fin de workflow. Un run global sans filtre **hors** de ce cadre (gate « Progression entièrement ✅ ») est **interdit**.

## Calibrage des process (`--processes=N`) — méthode, pas valeur figée

Chaque machine a une configuration différente (cœurs, RAM, ressources allouées à Docker) : mesurer, ne pas figer.

1. **Sonder les ressources**
   - Windows : `Get-CimInstance Win32_Processor | Select-Object NumberOfCores,NumberOfLogicalProcessors` ; RAM : `Get-CimInstance Win32_ComputerSystem`.
   - Linux/macOS : `nproc` (ou `sysctl -n hw.ncpu`), `free -h`.
   - Docker : `docker info --format "{{.NCPU}} CPU / {{.MemTotal}} bytes"` et `docker compose exec -T app nproc`.
2. **Échantillonner** : partir du défaut (`--parallel` seul = cœurs logiques détectés), puis tester `--processes=N` par paliers (ex. 4 → 6 → 8 → cœurs logiques).
3. **Choisir** : le N le plus rapide **avec 100 % de tests verts** et sans pression mémoire (surveiller `docker stats` ou le gestionnaire de tâches).
4. **En cas d'échecs en parallèle** : réduire N et suspecter un partage d'état (fichier/DB/cache). Un test ne doit dépendre ni de l'ordre d'exécution ni du worker.

## Fallback Docker

Si `php` n'est pas accessible localement (command not found, erreur d'environnement), utiliser Docker directement, sans déboguer le local :

```bash
docker compose exec -T app php artisan test --filter=NomDuTest
docker compose exec -T app php artisan test --parallel
```

**Pièges Docker connus :**

- Après toute modification de `compose.yaml` ou de l'entrypoint, rebuild requis (`docker compose build` puis `docker compose up -d --force-recreate`).
- Les tests ne doivent voir **aucun `DB_CONNECTION`** dans l'env du conteneur (sinon `.env` prend le pas sur `phpunit.xml`). Vérif : `docker compose exec -T app sh -c "env | grep -E '^DB_CONNECTION=' || echo absent"`.
- Les tests tournent sur SQLite `:memory:` (jamais la base de dev).

## Format de rapport

Rapporter uniquement :

1. Le résumé final (nombre de tests, assertions, durée).
2. Les échecs avec le message d'erreur et la localisation.

Ne pas recopier tout le stdout si tout passe — juste confirmer `OK`.
