<?php

namespace Tests\Feature\Architecture;

use Tests\TestCase;

/**
 * Base des tests d'architecture : une convention du projet devient un test.
 *
 * Copie tenue par workflow-kit (`packs/laravel-livewire/copies/`) : réécrite à chaque `workflow-kit sync`, ne pas la
 * modifier dans le projet (`check-meta` signale une copie différente du kit).
 *
 * - Exceptions : choix assumés et permanents, déclarés dans le test avec leur raison. Pour une règle livrée par le kit
 *   (`Kit/`), le projet les déclare dans `exceptions-projet.php` (à côté de cette classe) : `regle => [chemin => raison]`.
 * - Tolérances : dette à résorber, dans `tolerances/<regle>.json` (fichier => nombre d'occurrences).
 *   Cliquet : jamais plus que toléré, et un fichier assaini doit voir sa tolérance baisser.
 *   Une tolérance ne remonte jamais (contrôle `check-meta --tolerances` du kit, par rapport à la branche principale).
 * - Correction : le message d'échec dit quoi faire à la place (paramètre `$correction`).
 * - Génération initiale seulement : `ARCHITECTURE_GENERER_TOLERANCES=1` écrit la photo de l'existant au lieu de vérifier.
 */
abstract class ArchitectureTestCase extends TestCase
{
    /**
     * Fichiers sous un dossier relatif à la racine, chemins relatifs au séparateur « / » (mêmes clés sous Windows et Linux).
     *
     * @return list<string>
     */
    protected function fichiers(string $dossier, string $suffixe = '.php'): array
    {
        $racine = base_path($dossier);
        if (! is_dir($racine)) {
            return [];
        }

        $fichiers = [];
        $iterateur = new \RecursiveIteratorIterator(new \RecursiveDirectoryIterator($racine, \FilesystemIterator::SKIP_DOTS));
        foreach ($iterateur as $fichier) {
            if ($fichier->isFile() && str_ends_with($fichier->getFilename(), $suffixe)) {
                $fichiers[] = $this->relatif($fichier->getPathname());
            }
        }
        sort($fichiers);

        return $fichiers;
    }

    protected function relatif(string $chemin): string
    {
        $base = rtrim(str_replace('\\', '/', base_path()), '/').'/';

        return ltrim(str_replace($base, '', str_replace('\\', '/', $chemin)), '/');
    }

    protected function contenu(string $relatif): string
    {
        return (string) file_get_contents(base_path($relatif));
    }

    /** Code PHP sans les commentaires (une règle ne vise jamais un commentaire). */
    protected function codeSansCommentaires(string $source): string
    {
        $code = '';
        foreach (token_get_all($source) as $jeton) {
            if (is_array($jeton) && in_array($jeton[0], [T_COMMENT, T_DOC_COMMENT], true)) {
                continue;
            }
            $code .= is_array($jeton) ? $jeton[1] : $jeton;
        }

        return $code;
    }

    /**
     * Chaînes littérales d'un source PHP, sans leurs guillemets (ni commentaires, ni code).
     *
     * @return list<string>
     */
    protected function chaines(string $source): array
    {
        $chaines = [];
        foreach (token_get_all($source) as $jeton) {
            if (is_array($jeton) && $jeton[0] === T_CONSTANT_ENCAPSED_STRING) {
                $chaines[] = substr($jeton[1], 1, -1);
            }
        }

        return $chaines;
    }

    /** Vue Blade sans ses commentaires `{{-- --}}` (une règle ne vise jamais un commentaire). */
    protected function vueSansCommentaires(string $source): string
    {
        return (string) preg_replace('/\{\{--.*?--\}\}/s', '', $source);
    }

    /**
     * Classes CSS posées par une vue Blade, variantes retirées (`hover:bg-base-200` → `bg-base-200`) :
     * texte de l'attribut `class` et littéraux de ses `{{ }}`, littéraux de `:class` / `x-bind:class`,
     * de `@class(…)` et de `->class(…)`. Limite : une classe construite par concaténation (`'alert-'.$variant`)
     * ou rangée dans une variable PHP n'est pas lue.
     *
     * @return list<string>
     */
    protected function classesDeVue(string $source): array
    {
        $source = $this->vueSansCommentaires($source);
        $morceaux = [];

        preg_match_all('/(?<![\w:.-])class\s*=\s*"([^"]*)"/', $source, $attributs);
        foreach ($attributs[1] as $valeur) {
            $morceaux[] = (string) preg_replace('/\{\{.*?\}\}/s', ' ', $valeur);
            preg_match_all('/\{\{(.*?)\}\}/s', $valeur, $echos);
            foreach ($echos[1] as $echo) {
                array_push($morceaux, ...$this->litteraux($echo));
            }
        }

        preg_match_all('/(?<![\w.-])(?:x-bind)?:class\s*=\s*"([^"]*)"/', $source, $liaisons);
        preg_match_all('/(?:@class|->class)\s*(\((?:[^()]++|(?1))*\))/', $source, $appels);
        foreach ([...$liaisons[1], ...$appels[1]] as $code) {
            array_push($morceaux, ...$this->litteraux($code));
        }

        $classes = [];
        foreach (preg_split('/\s+/', implode(' ', $morceaux), -1, PREG_SPLIT_NO_EMPTY) as $jeton) {
            $classe = (string) preg_replace('/^(?:(?:[^:\[\]\s]|\[[^\]]*\])+:)+/', '', ltrim($jeton, '!'));
            if ($classe !== '' && ! preg_match('/[$\{\}()\'"`]/', $classe)) {
                $classes[] = $classe;
            }
        }

        return $classes;
    }

    /**
     * Chaînes littérales d'un extrait de code PHP ou JavaScript (`'…'`, `"…"`, `` `…` `` sans ses `${…}`).
     *
     * @return list<string>
     */
    private function litteraux(string $code): array
    {
        preg_match_all('/\'((?:[^\'\\\\]|\\\\.)*)\'|"((?:[^"\\\\]|\\\\.)*)"|`([^`]*)`/s', $code, $trouves, PREG_SET_ORDER);

        return array_map(
            fn (array $trouve) => (string) preg_replace('/\$\{[^}]*\}/', ' ', $trouve[3] ?? $trouve[2] ?? $trouve[1]),
            $trouves,
        );
    }

    /**
     * Compte, par fichier, les occurrences d'un motif dans le code sans commentaires.
     *
     * @param  list<string>  $fichiers
     * @return array<string, int>
     */
    protected function occurrences(array $fichiers, string $motif): array
    {
        $trouve = [];
        foreach ($fichiers as $fichier) {
            $source = $this->contenu($fichier);
            $code = str_ends_with($fichier, '.blade.php') ? $source : $this->codeSansCommentaires($source);
            $n = preg_match_all($motif, $code);
            if ($n > 0) {
                $trouve[$fichier] = $n;
            }
        }

        return $trouve;
    }

    /**
     * Exceptions déclarées par le projet pour une règle (`exceptions-projet.php` : `regle => [chemin => raison]`).
     *
     * @return array<string, string>
     */
    protected function exceptionsDuProjet(string $regle): array
    {
        $chemin = __DIR__.'/exceptions-projet.php';
        $toutes = is_file($chemin) ? require $chemin : [];

        return is_array($toutes[$regle] ?? null) ? $toutes[$regle] : [];
    }

    /**
     * Vérifie une règle : exceptions retirées (celles du test et celles du projet), puis tolérance avec cliquet.
     *
     * @param  array<string, int>  $trouve  fichier => occurrences
     * @param  array<string, string>  $exceptions  fichier, ou dossier terminé par « / » => raison
     * @param  array<string, string>  $details  fichier => précision ajoutée au message d'un écart (ex. ce qui manque)
     * @param  string  $correction  ce qu'il faut faire à la place, affiché quand un fichier dépasse sa tolérance
     */
    protected function assertRegleRespectee(string $regle, array $trouve, array $exceptions = [], array $details = [], string $correction = ''): void
    {
        $exceptions += $this->exceptionsDuProjet($regle);
        foreach (array_keys($trouve) as $fichier) {
            foreach (array_keys($exceptions) as $exception) {
                if ($fichier === $exception || (str_ends_with($exception, '/') && str_starts_with($fichier, $exception))) {
                    unset($trouve[$fichier]);
                }
            }
        }
        ksort($trouve);

        $chemin = __DIR__.'/tolerances/'.$regle.'.json';
        if (getenv('ARCHITECTURE_GENERER_TOLERANCES') === '1') {
            if ($trouve === []) {
                is_file($chemin) && unlink($chemin); // rien à tolérer : pas de fichier
            } else {
                is_dir(dirname($chemin)) || mkdir(dirname($chemin), 0777, true);
                file_put_contents($chemin, json_encode($trouve, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE)."\n");
            }
            $this->markTestSkipped("tolérances de « {$regle} » générées : ".count($trouve).' fichier(s)');
        }

        $tolere = is_file($chemin) ? (array) json_decode((string) file_get_contents($chemin), true) : [];
        $depassements = [];
        foreach ($trouve as $fichier => $n) {
            $max = $tolere[$fichier] ?? 0;
            if ($n > $max) {
                $depassements[] = "{$fichier} : {$n} occurrence(s), {$max} tolérée(s)".(isset($details[$fichier]) ? " : {$details[$fichier]}" : '');
            }
        }
        $assainis = [];
        foreach ($tolere as $fichier => $max) {
            $n = $trouve[$fichier] ?? 0;
            if ($n < $max) {
                $assainis[] = "{$fichier} : assaini ({$n} au lieu de {$max}), baisser sa tolérance dans tolerances/{$regle}.json";
            }
        }

        $ecarts = [...$depassements, ...$assainis];
        $message = "Règle « {$regle} » :\n".implode("\n", $ecarts);
        if ($depassements !== [] && $correction !== '') {
            $message .= "\nCorrection : {$correction}";
        }

        $this->assertSame([], $ecarts, $message);
    }
}
