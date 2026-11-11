import {
  findPermanentNotesLeftUnlinked,
  listLinksTouchingNotes,
  type UnlinkedPermanentNote,
} from '../../db/links';

// The mandatory-Link guard of ADR 0014 as every destructive path in this module asks it, in one
// place: the invariant holds at every moment, so removing a Link, deleting a note of either kind
// and deleting a Source are the same question asked about different sets of Links, not three
// rules (ADR 0014). Guard and cascade stay distinct - this decides whether the deletion happens,
// and the delete statement behind it is only the mechanics (ADR 0012).

// Which Permanent notes a deletion of these notes would leave with no Link at all.
//
// A cascade takes every Link touching a note going away, so the Links about to disappear are
// read first and the far ends of those Links are the notes whose count could change. The notes
// being deleted are themselves left out of the question: a Permanent note that is going away
// cannot be orphaned by its own deletion. The count is taken in either direction, since a
// Permanent note reachable only from another note's Links is linked.
export const findPermanentNotesOrphanedByDeleting = async ({
  noteIds,
  userId,
}: {
  noteIds: number[];
  userId: number;
}): Promise<UnlinkedPermanentNote[]> => {
  const cascading = await listLinksTouchingNotes({ noteIds });
  const deleted = new Set(noteIds);
  const farEnds = new Set<number>();
  cascading.forEach(({ originNoteId, targetNoteId }) => {
    if (!deleted.has(originNoteId)) farEnds.add(originNoteId);
    if (!deleted.has(targetNoteId)) farEnds.add(targetNoteId);
  });
  return findPermanentNotesLeftUnlinked({
    noteIds: [...farEnds],
    userId,
    removedLinkIds: cascading.map((link) => link.id),
  });
};

// The refusal names the ideas it is protecting, because that naming is what makes it
// actionable: the user's next move is to connect those notes elsewhere or delete them too, and
// neither is possible from a message that says only how many would be left (ADR 0014).
//
// One shape for every guard point, with the action it refused in front of it - the user is
// being told what their own move would have done, and the sentence reads the same whether the
// move was a removal or a deletion. What is left with nothing is named rather than implied:
// "with none" would lean on the word the action happens to carry, which is "connection" at one
// guard point and "note" or "Source" at the others.
export const orphanRefusal = (unlinked: UnlinkedPermanentNote[], action: string): string => {
  const titles = unlinked.map(({ title }) => `“${title}”`).join(', ');
  return unlinked.length === 1
    ? `${action} would leave ${titles} with nothing linked to it. Link it elsewhere first, or delete it.`
    : `${action} would leave these notes with nothing linked to them: ${titles}. Link them elsewhere first, or delete them.`;
};
