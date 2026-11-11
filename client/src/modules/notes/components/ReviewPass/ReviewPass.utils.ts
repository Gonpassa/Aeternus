import type { ReviewAnswerKind, ReviewQueueNote } from '@nee3/shared-types';

// What a sitting has produced so far, counted as it goes. Not a score and not stored: it is
// the material the closing card reports back, and it goes away with the page (ADR 0016).
export type SittingTally = Record<ReviewAnswerKind, number>;

export const EMPTY_TALLY: SittingTally = {
  nothing_here: 0,
  link_made: 0,
  permanent_note_written: 0,
};

export const addToTally = (tally: SittingTally, answer: ReviewAnswerKind): SittingTally => ({
  ...tally,
  [answer]: tally[answer] + 1,
});

// Where a pass is. The boundary is the end of the never-answered band rather than the end of
// the queue, which is what lets a pass be finished at all: the answered notes behind it remain
// available forever, offered rather than queued (ADR 0016).
export type ReviewStage =
  | { kind: 'nothing-written' }
  | { kind: 'note'; queued: ReviewQueueNote }
  | { kind: 'pass-end'; moreAvailable: boolean }
  | { kind: 'everything-seen' };

export const reviewStage = ({
  notes,
  dueCount,
  index,
  continued,
}: {
  notes: ReviewQueueNote[];
  dueCount: number;
  index: number;
  // Whether the user has chosen to carry on past the end of the pass into the notes they have
  // answered before. Not a second pass - the same sitting, continuing.
  continued: boolean;
}): ReviewStage => {
  if (notes.length === 0) {
    return { kind: 'nothing-written' };
  }
  if (index === dueCount && !continued) {
    return { kind: 'pass-end', moreAvailable: notes.length > dueCount };
  }
  const queued = notes[index];
  return queued === undefined ? { kind: 'everything-seen' } : { kind: 'note', queued };
};

const plural = (count: number, one: string, many: string): string =>
  `${count} ${count === 1 ? one : many}`;

// What the sitting produced, in the module's own words. Zeroes are left out rather than
// reported as zero: "nothing of mine here" is a complete outcome and the line is a report of a
// harvest, not a scorecard with empty rows.
export const harvestLine = (tally: SittingTally): string | null => {
  const parts = [
    tally.nothing_here > 0
      ? `${plural(tally.nothing_here, 'note', 'notes')} with nothing of yours in them yet`
      : null,
    tally.link_made > 0 ? plural(tally.link_made, 'Link made', 'Links made') : null,
    tally.permanent_note_written > 0
      ? plural(tally.permanent_note_written, 'Permanent note written', 'Permanent notes written')
      : null,
  ].filter((part): part is string => part !== null);
  return parts.length === 0 ? null : `${parts.join(' · ')}.`;
};
