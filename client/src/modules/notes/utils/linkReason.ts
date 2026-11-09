import type { Link } from '@nee3/shared-types';

// The one line of the user's own words saying why two notes belong together - required at link
// time, and the smallest unit of thinking in this module (ADR 0015). The rule lives here
// because every path that makes or rewrites a Link is held to it: the Permanent note composer,
// the browsable panel, and the connections view's edit in place.
//
// The backend's modules/notes/validation.ts is the authority on the ceiling - it is what a
// request is actually held to - and it is mirrored here so an over-long line is answered as it
// is typed rather than after a round trip. The number itself is argued for where it is
// enforced.
export const LINK_REASON_MAX = 140;

export const LINK_REASON_REQUIRED =
  'Every connection needs a line saying why the two belong together.';

export const LINK_REASON_TOO_LONG = `A reason is at most ${LINK_REASON_MAX} characters - longer than that is a note of its own.`;

// The message to show, or null when the line is fine. A string rather than a thrown error:
// these are the two things a reason can be refused for, and both are shown next to the field.
export const linkReasonError = (reason: string): string | null => {
  const trimmed = reason.trim();
  if (trimmed === '') {
    return LINK_REASON_REQUIRED;
  }
  if (trimmed.length > LINK_REASON_MAX) {
    return LINK_REASON_TOO_LONG;
  }
  return null;
};

// Which of a Link's two reasons belongs to the end reading it, and which to the other end.
// Direction is read off the row rather than stored as a flag: `reason` is the origin's,
// written when the Link was made, and `targetReason` is the target's, present only once that
// end has linked back (ADR 0013). A null Link is a pair that is not connected yet, which has
// neither.
export const attributeReasons = (
  link: Pick<Link, 'originNoteId' | 'reason' | 'targetReason'> | null,
  fromNoteId: number,
): { ownReason: string | null; otherReason: string | null } => {
  if (link === null) {
    return { ownReason: null, otherReason: null };
  }
  const isOrigin = link.originNoteId === fromNoteId;
  return {
    ownReason: isOrigin ? link.reason : link.targetReason,
    otherReason: isOrigin ? link.targetReason : link.reason,
  };
};
