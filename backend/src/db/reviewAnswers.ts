import { and, asc, eq, or, sql } from 'drizzle-orm';
import type { ReviewBand } from '@nee3/shared-types';
import { db } from './index';
import { links, notes, reviewAnswers, sources, Link, Note, ReviewAnswer } from './schema';

export interface NewReviewAnswerInput {
  noteId: number;
  answer: ReviewAnswer['answer'];
  producedLinkId: number | null;
  producedNoteId: number | null;
}

// The only write this table has. There is no update and no delete here, and none above it
// either: an Answer is a fact about a moment, and a second look at the same note writes a
// second row rather than correcting the first (ADR 0011). `noteKind` is set here rather than
// passed in, because the table's CHECK and composite FK already fix it to the Literature kind.
export const recordReviewAnswer = async (input: NewReviewAnswerInput): Promise<ReviewAnswer> => {
  const [created] = await db
    .insert(reviewAnswers)
    .values({ ...input, noteKind: 'literature' })
    .returning();
  if (!created) {
    throw new Error('Insert did not return a row');
  }
  return created;
};

// The most recent Answer a note has received, as two correlated reads of the same history:
// when it was answered, and which Answer that was. Both are needed and neither is stored on
// the note, since due-ness is a query over the history rather than a column (ADR 0011).
const lastAnsweredAt = sql<string | null>`(
  select max(last.created_at)
  from ${reviewAnswers} last
  where last.note_id = ${notes.id}
)`;

const lastAnswer = sql<ReviewAnswer['answer'] | null>`(
  select last.answer
  from ${reviewAnswers} last
  where last.note_id = ${notes.id}
  order by last.created_at desc, last.id desc
  limit 1
)`;

// The three bands, in the order Review hands them over (ADR 0016). The middle band is the
// structural stand-in for the "come back sooner" Answer that was refused: a note the user
// flagged as an open question and then found nothing in has genuinely unfinished business,
// and saying so this way grades nobody.
const band = sql<ReviewBand>`case
  when ${lastAnsweredAt} is null then 'never-answered'
  when ${lastAnswer} = 'nothing_here' and ${notes.openQuestion} then 'open-question'
  else 'answered'
end`;

// Which band a note is in is the CASE above; the order the bands are handed over in is a
// separate fact about Review, and sorting by the labels keeps it stated once rather than
// encoded a second time as ranks.
const bandOrder = sql`array_position(
  array['never-answered', 'open-question', 'answered'],
  ${band}
)`;

export interface ReviewQueueRow {
  note: Note;
  sourceTitle: string;
  band: ReviewBand;
}

// Every Literature note the user has, in queue order. Nothing is filtered out: an answered
// note drops behind the due ones and stays available forever, because a second look at the
// same reading months later is a different question rather than a repeat of the first
// (CONTEXT.md, Due).
//
// Within a band the sort is one expression rather than a branch: the first band has never been
// answered, so its notes fall back to their own creation order - oldest first, flat across
// Sources - while the other two sort by when they were last answered, least-recently first.
export const listReviewQueue = async ({
  userId,
}: {
  userId: number;
}): Promise<ReviewQueueRow[]> => {
  const rows = await db
    .select({ note: notes, sourceTitle: sources.title, band })
    .from(notes)
    .innerJoin(sources, eq(sources.id, notes.sourceId))
    .where(and(eq(notes.userId, userId), eq(notes.kind, 'literature')))
    .orderBy(
      asc(bandOrder),
      asc(sql`coalesce(${lastAnsweredAt}, ${notes.createdAt})`),
      asc(notes.id),
    );
  return rows;
};

// The one number the module shows, counting notes that have never been answered - which is
// also the length of the first band, and so the end of a pass (ADR 0016). Read on its own
// because the rail carries it on every page and does not need the queue to do it.
export const countNotesNeverAnswered = async ({ userId }: { userId: number }): Promise<number> => {
  const [row] = await db
    .select({ count: sql<string>`count(*)` })
    .from(notes)
    .where(
      and(
        eq(notes.userId, userId),
        eq(notes.kind, 'literature'),
        sql`not exists (
          select 1 from ${reviewAnswers} answered where answered.note_id = ${notes.id}
        )`,
      ),
    );
  return Number(row?.count ?? 0);
};

// A Link and a Permanent note read back as this user's, and as having come from the note
// being answered. Both halves matter: an Answer that named something belonging to someone
// else, or something unconnected to the note that supposedly produced it, would be a wrong
// fact in a table nothing ever corrects (ADR 0011).
//
// Ownership of a Link runs through the note at its origin, as it does everywhere else in this
// module: a Link carries no user of its own. Provenance is read from either end, because a
// Link is one row per unordered pair and linking B to A finds the A-to-B row rather than
// making a second one (ADR 0013) - so the note being answered may sit at either end of what
// its own Answer produced. The Permanent note's own mandatory Link (ADR 0014) is what ties it
// back to the note it was written from.
export const findProducedByNote = async ({
  userId,
  answeredNoteId,
  linkId,
  noteId,
}: {
  userId: number;
  answeredNoteId: number;
  linkId: number | null;
  noteId: number | null;
}): Promise<{ link: Link | null; note: Note | null }> => {
  const [link] =
    linkId === null
      ? []
      : await db
          .select({ link: links })
          .from(links)
          .innerJoin(notes, eq(notes.id, links.originNoteId))
          .where(
            and(
              eq(links.id, linkId),
              eq(notes.userId, userId),
              or(eq(links.originNoteId, answeredNoteId), eq(links.targetNoteId, answeredNoteId)),
            ),
          );
  const [note] =
    noteId === null
      ? []
      : await db
          .select()
          .from(notes)
          .where(
            and(
              eq(notes.id, noteId),
              eq(notes.userId, userId),
              eq(notes.kind, 'permanent'),
              sql`exists (
                select 1 from ${links} connection
                where (connection.origin_note_id = ${notes.id} and connection.target_note_id = ${answeredNoteId})
                   or (connection.target_note_id = ${notes.id} and connection.origin_note_id = ${answeredNoteId})
              )`,
            ),
          );
  return { link: link?.link ?? null, note: note ?? null };
};
