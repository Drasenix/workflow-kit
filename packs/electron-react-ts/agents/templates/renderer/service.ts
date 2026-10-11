// Statut : DÉFAUT PACK (non contractuel) — squelette de service renderer (appels IPC).

import { <Nom>DTO } from '../../../../shared/models/<nom>-dto';
import adapt<Noms> from '../adapters/<nom>-adapter';
import { <Nom> } from '../models/<nom>-model';

export async function getAll<Noms>(): Promise<<Nom>[]> {
  const data: <Nom>DTO[] = await window.electron.ipcRenderer.invokeMessage(
    'get-all-<noms>',
  );
  return adapt<Noms>(data);
}

export async function create<Nom>API(
  payload: Omit<<Nom>DTO, 'id'>,
): Promise<<Nom>DTO> {
  return window.electron.ipcRenderer.invokeMessage('create-<nom>', payload);
}

export async function update<Nom>API(
  id: number,
  payload: Partial<Omit<<Nom>DTO, 'id'>>,
): Promise<<Nom>DTO> {
  return window.electron.ipcRenderer.invokeMessage('update-<nom>', id, payload);
}

export async function delete<Nom>API(id: number): Promise<void> {
  return window.electron.ipcRenderer.invokeMessage('delete-<nom>', id);
}
