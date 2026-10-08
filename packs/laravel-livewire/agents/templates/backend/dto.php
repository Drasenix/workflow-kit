<?php

namespace App\DTO\<Domaine>;

class <Nom>Data
{
    public function __construct(
        public string $field,
        public ?int $optionalField = null,
    ) {}

    public static function fromArray(array $data): self
    {
        return new self(
            field: $data['field'],
            optionalField: $data['optional_field'] ?? null,
        );
    }

    public function toArray(): array
    {
        return [
            'field' => $this->field,
            'optional_field' => $this->optionalField,
        ];
    }
}
