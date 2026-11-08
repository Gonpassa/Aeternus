import type { LiteratureNote } from '@nee3/shared-types';
import type { Note } from '../../db/schema';

// One table holds both kinds behind a `kind` discriminator, so the five columns that belong
// to the other kind are null on every row (ADR 0012). The client is handed a discriminated
// union instead of that row: `kind` narrows it, and the fields it then sees are the ones the
// database's CHECK constraints guarantee are there.
export const toLiteratureNote = (row: Note): LiteratureNote => {
  if (row.kind !== 'literature' || row.sourceId === null) {
    throw new Error(`Note ${row.id} is not a Literature note`);
  }
  return {
    id: row.id,
    userId: row.userId,
    kind: 'literature',
    sourceId: row.sourceId,
    body: row.body,
    section: row.section,
    position: row.position,
    excerpt: row.excerpt,
    openQuestion: row.openQuestion,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
};
