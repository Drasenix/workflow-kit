<?php

// Statut : DÉFAUT PACK (non contractuel) — squelette de composant Livewire, à adapter par le projet.

namespace App\Livewire\<Domaine>;

use Livewire\Component;

class <Nom> extends Component
{
    public function boot(<Service> $service): void
    {
        $this->service = $service;
    }

    public function mount(): void
    {
        //
    }

    public function submit(): void
    {
        $this->validate();

        $this->service->doSomething($this->data);

        $this->dispatch('saved');
    }

    protected function rules(): array
    {
        return [
            'field' => ['required'],
        ];
    }

    public function render()
    {
        return view('livewire.<domaine>.<nom>');
    }
}
