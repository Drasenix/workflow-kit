<?php

namespace Tests\Feature\Architecture;

class <Regle>Test extends ArchitectureTestCase
{
    /**
     * Règle : <la convention, en une phrase, telle que le sommaire des règles la montre>.
     */
    public function test_<regle_en_snake_case>(): void
    {
        $trouve = $this->occurrences($this->fichiers('app'), '/<motif>/');

        $this->assertRegleRespectee('<regle-en-kebab-case>', $trouve, [
            // Exceptions assumées et permanentes, avec leur raison (pas une dette : une dette va en tolérance).
            // 'app/<Dossier>/' => '<raison>',
        ]);
    }
}
