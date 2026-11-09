import { and, asc, eq, inArray, sql } from 'drizzle-orm';
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
const bandRank = sql<number>`case
  when ${lastAnsweredAt} is null then 1
  when ${lastAnswer} = 'nothing_here' and ${notes.openQuestion} then 2
  else 3
end`;

export interface ReviewQueueRow {
  note: Note;
  sourceTitle: string;
  band: ReviewBand;
}

const BANDS: Record<number, ReviewBand> = {
  1: 'never-answered',
  2: 'open-question',
  3: 'answered',
};

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
    .select({ note: notes, sourceTitle: sources.title, band: bandRank })
    .from(notes)
    .innerJoin(sources, eq(sources.id, notes.sourceId))
    .where(and(eq(notes.userId, userId), eq(notes.kind, 'literature')))
    .orderBy(
      asc(bandRank),
      asc(sql`coalesce(${lastAnsweredAt}, ${notes.createdAt})`),
      asc(notes.id),
    );
  return rows.map((row) => ({
    note: row.note,
    sourceTitle: row.sourceTitle,
    // The rank is produced by the CASE above and so is always one of its three branches; the
    // fallback is the handover from an untyped SQL fragment, not a case that occurs.
    band: BANDS[Number(row.band)] ?? 'answered',
  }));
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

// A Link and a Permanent note read back as this user's, so an Answer never records having
// produced something that is not theirs. Ownership of a Link runs through the note at its
// origin, as it does everywhere else in this module: a Link carries no user of its own.
export const findOwnedLinkAndNote = async ({
  userId,
  linkId,
  noteId,
}: {
  userId: number;
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
          .where(and(eq(links.id, linkId), eq(notes.userId, userId)));
  const [note] =
    noteId === null
      ? []
      : await db
          .select()
          .from(notes)
          .where(and(eq(notes.id, noteId), eq(notes.userId, userId), eq(notes.kind, 'permanent')));
  return { link: link?.link ?? null, note: note ?? null };
};

// One note's Answers, newest first. Nothing in the interface reads this - the history exists
// to be queried by #76 and by Phase 10 (ADR 0011) - so it is here for the tests that hold the
// table append-only and for whichever of those two gets to it first.
export const listReviewAnswersByNoteIds = async ({
  noteIds,
}: {
  noteIds: number[];
}): Promise<ReviewAnswer[]> => {
  if (noteIds.length === 0) {
    return [];
  }
  return db
    .select()
    .from(reviewAnswers)
    .where(inArray(reviewAnswers.noteId, noteIds))
    .orderBy(asc(reviewAnswers.createdAt), asc(reviewAnswers.id));
};
