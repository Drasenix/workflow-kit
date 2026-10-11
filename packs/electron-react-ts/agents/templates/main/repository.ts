// Statut : DÉFAUT PACK (non contractuel) — squelette de repository SQLite (main process).

import { <Nom>DTO } from '../../../shared/models/<nom>-dto';
import getDatabase from '../database';

export function getAll<Noms>(): <Nom>DTO[] {
  const db = getDatabase();
  return db.prepare('SELECT id FROM <table>').all() as <Nom>DTO[];
}

export function get<Nom>ById(id: number): <Nom>DTO | undefined {
  const db = getDatabase();
  return db.prepare('SELECT id FROM <table> WHERE id = ?').get(id) as
    | <Nom>DTO
    | undefined;
}

export function create<Nom>(payload: Omit<<Nom>DTO, 'id'>): <Nom>DTO {
  const db = getDatabase();
  const result = db
    .prepare('INSERT INTO <table> (id) VALUES (@id)')
    .run({ id: payload.id });
  return get<Nom>ById(result.lastInsertRowid as number)!;
}

export function update<Nom>(
  id: number,
  payload: Partial<Omit<<Nom>DTO, 'id'>>,
): <Nom>DTO {
  const db = getDatabase();
  db.prepare('UPDATE <table> SET id = COALESCE(@id, id) WHERE id = @id').run({
    ...payload,
    id,
  });
  return get<Nom>ById(id)!;
}

export function delete<Nom>(id: number): void {
  const db = getDatabase();
  db.prepare('DELETE FROM <table> WHERE id = ?').run(id);
}
