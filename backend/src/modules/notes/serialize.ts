import type {
  Link as ApiLink,
  LinkTargetCandidate,
  LiteratureNote,
  Note as ApiNote,
  NoteConnection,
  NoteConnections,
  PermanentNote,
  Topic,
  TopicRelatedNote,
} from '@nee3/shared-types';
import type { Link, Note, Topic as DbTopic } from '../../db/schema';
import type { ConnectionRows } from '../../db/links';
import type { TopicRelatedNoteRow } from '../../db/topics';

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

export const toTopic = (row: DbTopic): Topic => ({
  id: row.id,
  userId: row.userId,
  name: row.name,
  createdAt: row.createdAt.toISOString(),
});

// A note as the link panel's Topic tier reads it, either kind, with the Topics that put it in
// the tier and - for a Literature note, which has no title - its Source's title (#87).
export const toTopicRelatedNote = ({
  note,
  sourceTitle,
  topics,
}: TopicRelatedNoteRow): TopicRelatedNote => ({
  note: toNote(note),
  sourceTitle,
  topics: topics.map(toTopic),
});

// One row of the Link panel. The note travels whole rather than as a preview, because a result
// has to be readable where it is found: the panel exists so that linking never depends on
// remembering how an older note was worded (#67), and a row the user has to open to recognize
// would put that back.
export const toLinkTargetCandidate = (
  { note, sourceTitle }: { note: Note; sourceTitle: string | null },
  existingLink: Link | null,
): LinkTargetCandidate => ({
  note: toNote(note),
  sourceTitle,
  existingLink: existingLink === null ? null : toLink(existingLink),
});
