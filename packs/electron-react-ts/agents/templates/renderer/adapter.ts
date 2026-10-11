// Statut : DÉFAUT PACK (non contractuel) — squelette d'adapter DTO -> modèle.

import { <Nom>DTO } from '../../../../shared/models/<nom>-dto';
import { <Nom> } from '../models/<nom>-model';

export default function adapt<Noms>(<noms>: <Nom>DTO[]): <Nom>[] {
  return <noms>.map((<nom>) => adapt<Nom>(<nom>));
}

export function adapt<Nom>(<nom>: <Nom>DTO): <Nom> {
  const { id } = <nom>;
  return { id };
}
