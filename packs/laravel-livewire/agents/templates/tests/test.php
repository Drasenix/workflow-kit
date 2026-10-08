<?php

namespace Tests\Feature\<Domaine>;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class <Nom>Test extends TestCase
{
    use RefreshDatabase;

    protected bool $seed = true;

    // Nommer d'après le comportement (préfixe test_), sans identifiant de scénario (B1/E1).
    // La classe porte le nom de la feature, sans identifiant de lot (F0/F1...).
    public function test_description(): void
    {
        // GIVEN
        // WHEN
        // THEN
    }
}
