<?php

namespace Tests\Feature\Architecture;

use Tests\TestCase;

/**
 * Base des tests d'architecture : une convention du projet devient un test.
 *
 * - Exceptions : choix assumés et permanents, déclarés dans le test avec leur raison.
 * - Tolérances : dette à résorber, dans `tolerances/<regle>.json` (fichier => nombre d'occurrences).
 *   Cliquet : jamais plus que toléré, et un fichier assaini doit voir sa tolérance baisser.
 *   Une tolérance ne remonte jamais (contrôle `check-meta --tolerances` du kit, par rapport à la branche principale).
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
     * Vérifie une règle : exceptions retirées, puis tolérance avec cliquet.
     *
     * @param  array<string, int>  $trouve  fichier => occurrences
     * @param  array<string, string>  $exceptions  fichier, ou dossier terminé par « / » => raison
     */
    protected function assertRegleRespectee(string $regle, array $trouve, array $exceptions = []): void
    {
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
            if (! is_dir(dirname($chemin))) {
                mkdir(dirname($chemin), 0777, true);
            }
            file_put_contents($chemin, json_encode((object) $trouve, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE)."\n");
            $this->markTestSkipped("tolérances de « {$regle} » générées : ".count($trouve).' fichier(s)');
        }

        $tolere = is_file($chemin) ? (array) json_decode((string) file_get_contents($chemin), true) : [];
        $ecarts = [];
        foreach ($trouve as $fichier => $n) {
            $max = $tolere[$fichier] ?? 0;
            if ($n > $max) {
                $ecarts[] = "{$fichier} : {$n} occurrence(s), {$max} tolérée(s)";
            }
        }
        foreach ($tolere as $fichier => $max) {
            $n = $trouve[$fichier] ?? 0;
            if ($n < $max) {
                $ecarts[] = "{$fichier} : assaini ({$n} au lieu de {$max}), baisser sa tolérance dans tolerances/{$regle}.json";
            }
        }

        $this->assertSame([], $ecarts, "Règle « {$regle} » :\n".implode("\n", $ecarts));
    }
}
