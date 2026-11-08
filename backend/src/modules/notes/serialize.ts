import type {
  Link as ApiLink,
  LiteratureNote,
  Note as ApiNote,
  NoteConnection,
  NoteConnections,
  PermanentNote,
} from '@nee3/shared-types';
import type { Link, Note } from '../../db/schema';
import type { ConnectionRows } from '../../db/links';

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

export const toPermanentNote = (row: Note): PermanentNote => {
  if (row.kind !== 'permanent' || row.title === null) {
    throw new Error(`Note ${row.id} is not a Permanent note`);
  }
  return {
    id: row.id,
    userId: row.userId,
    kind: 'permanent',
    title: row.title,
    body: row.body,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
};

// `kind` is read first, which is what reading a row from a single-table-two-kinds schema means
// (ADR 0012). Everything downstream of this holds the union rather than the row.
export const toNote = (row: Note): ApiNote =>
  row.kind === 'permanent' ? toPermanentNote(row) : toLiteratureNote(row);

export const toLink = (row: Link): ApiLink => ({
  id: row.id,
  originNoteId: row.originNoteId,
  targetNoteId: row.targetNoteId,
  reason: row.reason,
  targetReason: row.targetReason,
  createdAt: row.createdAt.toISOString(),
  updatedAt: row.updatedAt.toISOString(),
});

const toConnection = ({
  link,
  other,
  sourceTitle,
}: ConnectionRows['connectsTo'][number]): NoteConnection => ({
  link: toLink(link),
  other: toNote(other),
  sourceTitle,
});

export const toConnections = (rows: ConnectionRows): NoteConnections => ({
  connectsTo: rows.connectsTo.map(toConnection),
  connectedFrom: rows.connectedFrom.map(toConnection),
});

export const EMPTY_CONNECTIONS: NoteConnections = { connectsTo: [], connectedFrom: [] };
