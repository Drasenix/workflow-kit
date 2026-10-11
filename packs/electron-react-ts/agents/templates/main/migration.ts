// Statut : DÉFAUT PACK (non contractuel) — squelette de migration (main process).

import Database from 'better-sqlite3';

export default function runMigration<NNN>(db: Database.Database): void {
  try {
    db.exec(`ALTER TABLE <table> ADD COLUMN <colonne> TEXT;`);
  } catch {
    // colonne déjà existante
  }
}
