import type { Link, LinkTargetCandidate, TopicRelatedNote } from '@nee3/shared-types';

// How long the search query trails the typing. Long enough that a phrase is searched rather
// than each of its letters, short enough that the results feel like they belong to what is in
// the box.
export const SEARCH_DEBOUNCE_MS = 250;

// The Topic tier's rows, in the shape every other tier's rows have. The Topics endpoint knows
// about Topics and nothing about Links (#87), so the Link that already connects a row is
// matched here off the Links the panel read with its own tiers: the note at the other end
// identifies it, since there is at most one per unordered pair (ADR 0013).
//
// A note the first tier already offered is dropped rather than shown twice: the panel reads as
// one list in parts, and the same card appearing under two headings would read as two notes.
export const toTopicCandidates = ({
  related,
  existingLinks,
  fromNoteId,
  alreadyOffered,
}: {
  related: TopicRelatedNote[];
  existingLinks: Link[];
  fromNoteId: number;
  alreadyOffered: Set<number>;
}): LinkTargetCandidate[] => {
  const byOtherEnd = new Map(
    existingLinks.map((link) => [
      link.originNoteId === fromNoteId ? link.targetNoteId : link.originNoteId,
      link,
    ]),
  );
  return related
    .filter((row) => !alreadyOffered.has(row.note.id))
    .map((row) => ({
      note: row.note,
      sourceTitle: row.sourceTitle,
      existingLink: byOtherEnd.get(row.note.id) ?? null,
    }));
};
