<?php

namespace Tests\Unit\<Domaine>;

use <Imports>;
use PHPUnit\Framework\TestCase;

class <Nom>Test extends TestCase
{
    // Pas de RefreshDatabase, pas de $seed.
    // Pas d'assertDatabaseHas / assertDatabaseMissing.
    // Pas de $model->refresh() / $model->fresh().
    // Pas de factory()->create() / save() / update() / DB::transaction().
    //
    // Règle binaire : si le GIVEN nécessite des modèles persistés OU le THEN vérifie
    // l'état de la DB → c'est un TI dans tests/Feature/. Sinon → TU ici.

    // Nommer d'après le comportement (préfixe test_), sans identifiant de scénario (B1/E1).
    // La classe porte le nom de la feature, sans identifiant de lot (F0/F1...).
    public function test_description(): void
    {
        // GIVEN — données brutes (primitives, objets simples, pas de modèles persistés)
        // WHEN — appel direct à la classe/méthode
        // THEN — assertion sur la valeur de retour uniquement (pas d'état DB)
    }
}
