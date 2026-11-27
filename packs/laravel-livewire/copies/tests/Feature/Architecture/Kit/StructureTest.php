<?php

namespace Tests\Feature\Architecture\Kit;

use Tests\Feature\Architecture\ArchitectureTestCase;

/**
 * Règles de structure communes à tout projet Laravel + Livewire, livrées par workflow-kit.
 *
 * Copie tenue par le kit (`packs/laravel-livewire/copies/`) : réécrite à chaque `workflow-kit sync`, ne pas la modifier
 * dans le projet. Les tolérances restent au projet (`tests/Feature/Architecture/tolerances/`) ; une exception propre au
 * projet se déclare dans `tests/Feature/Architecture/exceptions-projet.php`.
 */
class StructureTest extends ArchitectureTestCase
{
    /** Au-delà, un fichier de `app/` est trop long pour être relu d'un trait. */
    private const SEUIL_LIGNES = 400;

    /** La tolérance d'un fichier trop long se compte par tranches : une petite correction ne la dépasse pas. */
    private const TRANCHE_LIGNES = 50;

    /**
     * Règle : un échec se signale par une exception métier, jamais par un tableau `['status' => 'success'|'error']` (une réponse HTTP de `app/Http/` reste libre de son format).
     */
    public function test_un_echec_se_signale_par_une_exception_et_non_par_un_tableau_de_statut(): void
    {
        $this->assertRegleRespectee(
            'statut-en-tableau',
            $this->occurrences($this->fichiers('app'), '/[\'"]stat(?:us|ut)[\'"]\s*=>\s*[\'"](?:success|error)[\'"]/'),
            ['app/Http/' => "une réponse HTTP peut porter un champ status : c'est son contrat, pas un signal d'échec interne"],
            correction: "lève une exception métier (app/Exceptions/<Domaine>/, modèle .agents/templates/backend/exception.php) ; l'appelant l'attrape et l'affiche. En cas de succès, la méthode rend son résultat.",
        );
    }

    /**
     * Règle : une transaction s'écrit `DB::transaction(fn () => …)`, jamais `DB::beginTransaction()` suivi d'un `commit()` / `rollBack()` à la main.
     */
    public function test_une_transaction_s_ecrit_par_une_fermeture(): void
    {
        $this->assertRegleRespectee(
            'transaction-manuelle',
            $this->occurrences($this->fichiers('app'), '/\bDB::beginTransaction\s*\(/'),
            correction: "écris DB::transaction(function () { … }) : l'annulation est automatique si une exception remonte, aucun chemin ne laisse la transaction ouverte.",
        );
    }

    /**
     * Règle : une Action de `app/Actions/` n'est pas statique : ses dépendances arrivent par le constructeur, l'appelant la reçoit par injection.
     */
    public function test_une_action_n_est_pas_statique(): void
    {
        $this->assertRegleRespectee(
            'action-statique',
            $this->occurrences($this->fichiers('app/Actions'), '/\bpublic\s+static\s+function\s+(?:execute|handle|__invoke)\s*\(/'),
            correction: "Action non statique : dépendances en paramètres du constructeur, méthode execute() d'instance (modèle .agents/templates/backend/action.php) ; l'appelant la reçoit par injection.",
        );
    }

    /**
     * Règle : une classe reçoit ses dépendances par injection ; `app(X::class)`, `resolve(X::class)` et `App::make()` ne s'écrivent que dans `app/Providers/`.
     */
    public function test_une_dependance_arrive_par_injection_et_non_par_le_conteneur(): void
    {
        $this->assertRegleRespectee(
            'service-locator',
            $this->occurrences($this->fichiers('app'), '/(?<![\w>:$\\\\])(?:app|resolve)\(\s*\\\\?[A-Z][\w\\\\]*::class|\bApp::make\s*\(/'),
            ['app/Providers/' => 'les fournisseurs de services configurent le conteneur'],
            correction: 'reçois la dépendance par le constructeur ; dans un composant Livewire, par un paramètre de boot() rangé dans une propriété protégée.',
        );
    }

    /**
     * Règle : un Job de `app/Jobs/` ne fait que s'exécuter en file : hors de `app/Jobs/`, il ne s'injecte pas, ne s'instancie pas hors `dispatch(…)` et n'expose ni méthode ni constante lue en direct.
     */
    public function test_un_job_ne_sert_jamais_de_service(): void
    {
        $jobs = array_map(fn (string $fichier) => preg_quote(basename($fichier, '.php'), '/'), $this->fichiers('app/Jobs'));
        $trouve = [];
        if ($jobs !== []) {
            $nom = '(?:'.implode('|', $jobs).')';
            $chemin = '\\\\?(?:[\w\\\\]+\\\\)?';
            $motif = '/'.implode('|', [
                "(?<![\\w>:$\\\\])(?:app|resolve)\\(\\s*{$chemin}{$nom}::class",
                "(?<!dispatch\\(|dispatchSync\\(|dispatch_sync\\()\\bnew\\s+{$chemin}{$nom}\\b",
                "\\b{$nom}\\s+\\$\\w+",
                "\\b{$nom}::(?!dispatch\\w*\\b|withChain\\b|class\\b)\\w+",
            ]).'/';
            $trouve = $this->occurrences($this->fichiers('app'), $motif);
        }

        $this->assertRegleRespectee(
            'job-utilise-comme-service',
            $trouve,
            ['app/Jobs/' => 'le Job lui-même'],
            correction: 'déplace la règle que tu veux réutiliser dans une classe dédiée (un *Calculator pour un calcul, une Action pour une opération), que le Job appelle aussi ; le Job ne fait que s\'exécuter en file.',
        );
    }

    /**
     * Règle : un fichier de `app/` ne dépasse pas 400 lignes (tolérance d'un fichier existant comptée par tranches de 50 lignes).
     */
    public function test_un_fichier_ne_depasse_pas_le_plafond_de_lignes(): void
    {
        $trouve = [];
        foreach ($this->fichiers('app') as $fichier) {
            $lignes = count(file(base_path($fichier)));
            if ($lignes > self::SEUIL_LIGNES) {
                $trouve[$fichier] = (int) ceil($lignes / self::TRANCHE_LIGNES);
            }
        }

        $this->assertRegleRespectee(
            'taille-de-classe',
            $trouve,
            correction: 'classe trop longue (compte = lignes / 50, arrondi au-dessus) : avant d\'y ajouter du code, extrais la partie que tu modifies dans une Action (opération) ou un *Calculator (calcul pur).',
        );
    }

    /**
     * Règle : une classe `*Calculator` ou `*Query*` n'écrit jamais en base (ni création, ni modification, ni suppression).
     */
    public function test_un_calculator_ou_une_query_n_ecrit_pas(): void
    {
        $fichiers = array_values(array_filter(
            $this->fichiers('app'),
            fn (string $fichier) => (bool) preg_match('/(?:Calculator|Query)\w*\.php$/', basename($fichier)),
        ));
        $motif = '/::(?:create|insert|upsert|updateOrCreate|firstOrCreate|updateOrInsert|destroy|truncate)\s*\('
            .'|->(?:save|update|delete|insert|upsert|updateOrInsert|forceDelete|increment|decrement|attach|detach|sync)\s*\('
            .'|\bDB::(?:statement|insert|update|delete|unprepared|affectingStatement)\s*\(/';

        $this->assertRegleRespectee(
            'calculator-et-query-n-ecrivent-pas',
            $this->occurrences($fichiers, $motif),
            correction: 'un *Calculator calcule, une *Query lit : l\'écriture va dans une Action, qui peut les appeler.',
        );
    }
}
