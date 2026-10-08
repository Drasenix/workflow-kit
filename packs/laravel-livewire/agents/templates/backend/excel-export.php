<?php

namespace App\Exports;

use Maatwebsite\Excel\Concerns\FromCollection;
use Maatwebsite\Excel\Concerns\WithHeadings;
use Maatwebsite\Excel\Concerns\WithCustomCsvSettings;

// Dépendance optionnelle : maatwebsite/excel (voir .agents/stack.md).
// Adapter colonnes et entêtes au tableau exporté.
class MonExport implements FromCollection, WithHeadings, WithCustomCsvSettings
{
    public function __construct(private $data) {}

    public function collection()
    {
        return $this->data->map(fn ($item) => [
            $item->reference,
            $item->label,
            $item->status?->label ?? '',
            $item->created_at->format('d/m/Y'),
        ]);
    }

    public function headings(): array
    {
        return ['Référence', 'Libellé', 'Statut', 'Date'];
    }

    public function getCsvSettings(): array
    {
        return [
            'delimiter' => ';',
            'enclosure' => '"',
            'use_bom' => true,
            'output_encoding' => 'UTF-8',
        ];
    }
}
