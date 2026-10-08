<?php

namespace App\Events;

use Illuminate\Foundation\Events\Dispatchable;

class <Nom>Event
{
    use Dispatchable;

    public function __construct(
        public <Model> $entity,
    ) {}
}
