// Statut : DÉFAUT PACK (non contractuel) — squelette de service main (thin, délègue au repository).

import { <Nom>DTO } from '../../../shared/models/<nom>-dto';
import { getAll<Noms> } from '../repositories/<nom>-repository';

export default function fetchAll<Noms>(): <Nom>DTO[] {
  return getAll<Noms>();
}
