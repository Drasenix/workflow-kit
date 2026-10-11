// Statut : DÉFAUT PACK (non contractuel) — squelette de facade (API publique du domaine).

import { adapt<Nom> } from '../adapters/<nom>-adapter';
import <Nom>Engine from '../engine/<nom>-engine';
import { <Nom> } from '../models/<nom>-model';
import {
  create<Nom>API,
  delete<Nom>API,
  getAll<Noms>,
  update<Nom>API,
} from '../services/<nom>-service';

async function prepare<Nom>Engine(): Promise<<Nom>Engine> {
  const engine = <Nom>Engine.getInstance();
  return engine;
}

export async function get<Noms>(): Promise<<Nom>[]> {
  return getAll<Noms>();
}

export async function create<Nom>(payload: Omit<<Nom>, 'id'>): Promise<<Nom>> {
  return adapt<Nom>(await create<Nom>API(payload));
}

export async function update<Nom>(
  id: number,
  payload: Partial<Omit<<Nom>, 'id'>>,
): Promise<<Nom>> {
  return adapt<Nom>(await update<Nom>API(id, payload));
}

export async function delete<Nom>(id: number): Promise<void> {
  await delete<Nom>API(id);
}
