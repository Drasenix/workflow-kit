// Statut : DÉFAUT PACK (non contractuel) — squelette d'enregistrement d'un canal IPC.
//
// 1) Ajouter '<channel>' à l'union `Channels` (src/main/preload.ts).
// 2) Enregistrer le handler ci-dessous dans src/main/icpEvents.ts.

import { ipcMain } from 'electron';

export function register<Nom>Handlers(): void {
  ipcMain.handle('<channel>', async (_event, ...args: unknown[]) => {
    return args;
  });
}
