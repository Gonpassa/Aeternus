import { SOURCE_KINDS, type ReviewAnswerKind, type SourceKind } from '@nee3/shared-types';
import { sanitizeTopicName } from './sanitize';

export type ValidationResult = { valid: true } | { valid: false; error: string };

// Generous maxima, kept here rather than as column types so the ceiling is a sanity bound
// with a message in the module's voice instead of a Postgres error (ADR 0012, ADR 0017).
// They are set where a real Source never reaches them: a title or an author that runs past
// 140 characters is not a title or an author, and 2,000 is the length browsers themselves
// stop guaranteeing for a URL.
export const SOURCE_TITLE_MAX = 140;
export const SOURCE_AUTHOR_MAX = 140;
export const SOURCE_URL_MAX = 2000;
export const NOTE_SECTION_MAX = 140;
export const NOTE_POSITION_MAX = 140;
export const LITERATURE_NOTE_BODY_MAX = 4000;
export const LITERATURE_NOTE_EXCERPT_MAX = 4000;
export const PERMANENT_NOTE_TITLE_MAX = 280;
export const PERMANENT_NOTE_BODY_MAX = 8000;
// One line stays one line. The ceiling is a sanity bound, not a nudge: a user who reaches it
// is being told to write a Permanent note by the only mechanism that should tell them
// (ADR 0015).
export const LINK_REASON_MAX = 140;

const trimmed = (value: unknown): string => (typeof value === 'string' ? value.trim() : '');

const isWithin = (value: unknown, max: number): boolean =>
  typeof value === 'string' && trimmed(value).length <= max;

// Absent, null and blank all mean "not given" for an optional field: a form submits an
// untouched input as the empty string, and sanitize.ts turns all three into a null column.
// A non-string is none of those - it falls through to the field's own check and is refused.
const isOmitted = (value: unknown): boolean =>
  value === undefined || value === null || (typeof value === 'string' && value.trim() === '');

const isSourceKind = (value: unknown): value is SourceKind =>
  typeof value === 'string' && (SOURCE_KINDS as readonly string[]).includes(value);

// `url` is held to http(s) rather than merely to a length. A Source's link is rendered as a
// link, so a `javascript:` or `data:` scheme would be an injection surface, and a bare
// "example.com" would resolve against this app's own origin.
const isHttpUrl = (value: unknown): boolean =>
  typeof value === 'string' && /^https?:\/\/\S+$/i.test(value.trim());

export const validateSourceInput = (input: {
  title?: unknown;
  kind?: unknown;
  author?: unknown;
  url?: unknown;
}): ValidationResult => {
  if (trimmed(input.title) === '') {
    return { valid: false, error: 'A Source needs a title.' };
  }
  if (!isWithin(input.title, SOURCE_TITLE_MAX)) {
    return { valid: false, error: `A Source title is at most ${SOURCE_TITLE_MAX} characters.` };
  }
  if (!isSourceKind(input.kind)) {
    return { valid: false, error: 'A Source is a book, an article, a video, or something else.' };
  }
  if (!isOmitted(input.author) && !isWithin(input.author, SOURCE_AUTHOR_MAX)) {
    return { valid: false, error: `An author is at most ${SOURCE_AUTHOR_MAX} characters.` };
  }
  if (!isOmitted(input.url)) {
    if (!isHttpUrl(input.url)) {
      return { valid: false, error: 'A Source link must start with http:// or https://.' };
    }
    if (!isWithin(input.url, SOURCE_URL_MAX)) {
      return {
        valid: false,
        error: `A Source link is at most ${SOURCE_URL_MAX.toLocaleString('en-US')} characters.`,
      };
    }
  }
  return { valid: true };
};

// A Literature note's shape, checked here in the module's voice above the CHECK constraints
// that state the same requirements in the database (ADR 0012). The Locator rule is the one
// worth reading twice: section and position are each optional, and at least one of the two
// is required, because either alone is a complete Locator (CONTEXT.md, Locator).
export const validateLiteratureNoteInput = (input: {
  body?: unknown;
  section?: unknown;
  position?: unknown;
  excerpt?: unknown;
  openQuestion?: unknown;
}): ValidationResult => {
  if (trimmed(input.body) === '') {
    return { valid: false, error: 'A note needs a few words of your own.' };
  }
  if (!isWithin(input.body, LITERATURE_NOTE_BODY_MAX)) {
    return {
      valid: false,
      error: `A note is at most ${LITERATURE_NOTE_BODY_MAX.toLocaleString('en-US')} characters.`,
    };
  }
  if (isOmitted(input.section) && isOmitted(input.position)) {
    return { valid: false, error: 'A note needs a section or a position - either one will do.' };
  }
  if (!isOmitted(input.section) && !isWithin(input.section, NOTE_SECTION_MAX)) {
    return { valid: false, error: `A section is at most ${NOTE_SECTION_MAX} characters.` };
  }
  if (!isOmitted(input.position) && !isWithin(input.position, NOTE_POSITION_MAX)) {
    return { valid: false, error: `A position is at most ${NOTE_POSITION_MAX} characters.` };
  }
  if (!isOmitted(input.excerpt) && !isWithin(input.excerpt, LITERATURE_NOTE_EXCERPT_MAX)) {
    return {
      valid: false,
      error: `An excerpt is at most ${LITERATURE_NOTE_EXCERPT_MAX.toLocaleString('en-US')} characters.`,
    };
  }
  // Absent means false - the flag is set while writing or afterwards, so an omitted flag is
  // an unflagged note rather than a malformed request. Anything other than a boolean is not.
  if (input.openQuestion !== undefined && typeof input.openQuestion !== 'boolean') {
    return { valid: false, error: 'An open question is either flagged or not.' };
  }
  return { valid: true };
};

const isPositiveInteger = (value: unknown): boolean =>
  typeof value === 'number' && Number.isInteger(value) && value > 0;

// The reason on its own, for the edit-in-place path: the Link already exists and only the line
// is being rewritten. It cannot be emptied, because a Link with no reason from the end that
// made it is not a state this module allows (ADR 0015).
export const validateLinkReason = (reason: unknown): ValidationResult => {
  if (trimmed(reason) === '') {
    return {
      valid: false,
      error: 'Every connection needs a line saying why the two belong together.',
    };
  }
  if (!isWithin(reason, LINK_REASON_MAX)) {
    return {
      valid: false,
      error: `A reason is at most ${LINK_REASON_MAX} characters - longer than that is a note of its own.`,
    };
  }
  return { valid: true };
};

// A Permanent note's shape, including the Links it cannot be saved without. The Link rules are
// part of this validation rather than a step after it, because the note and its first Links are
// one request: a missing Link and a target picked without a reason both block the save, and
// neither is a separate transaction that could half-succeed (ADR 0014, ADR 0015).
export const validatePermanentNoteInput = (input: {
  title?: unknown;
  body?: unknown;
  links?: unknown;
}): ValidationResult => {
  if (trimmed(input.title) === '') {
    return { valid: false, error: 'A Permanent note needs a title stating the idea as a claim.' };
  }
  if (!isWithin(input.title, PERMANENT_NOTE_TITLE_MAX)) {
    return { valid: false, error: `A title is at most ${PERMANENT_NOTE_TITLE_MAX} characters.` };
  }
  if (trimmed(input.body) === '') {
    return { valid: false, error: 'A Permanent note needs the idea written out.' };
  }
  if (!isWithin(input.body, PERMANENT_NOTE_BODY_MAX)) {
    return {
      valid: false,
      error: `A note is at most ${PERMANENT_NOTE_BODY_MAX.toLocaleString('en-US')} characters.`,
    };
  }
  if (!Array.isArray(input.links) || input.links.length === 0) {
    return {
      valid: false,
      error: 'A Permanent note needs at least one connection to a note already in the box.',
    };
  }
  const targetIds: number[] = [];
  for (const draft of input.links) {
    const link = draft as { targetNoteId?: unknown; reason?: unknown };
    if (!isPositiveInteger(link.targetNoteId)) {
      return { valid: false, error: 'A connection needs a note to connect to.' };
    }
    // The same rule the browsable panel's reasons are held to: it is the same thing being
    // written, so there is one place it is checked (ADR 0015).
    const reason = validateLinkReason(link.reason);
    if (!reason.valid) {
      return reason;
    }
    targetIds.push(link.targetNoteId as number);
  }
  // There is at most one Link per unordered pair, so the same note twice is one Link asked for
  // twice rather than two Links (ADR 0013). Caught here so it reads as the mistake it is
  // instead of as a unique-index violation.
  if (new Set(targetIds).size !== targetIds.length) {
    return { valid: false, error: 'A note can only be connected once.' };
  }
  return { valid: true };
};

// A Topic is a label, not a sentence: a name that runs past 60 characters is a claim, and a
// claim belongs in a Permanent note's title. The count ceiling is the same kind of sanity
// bound - a carrier wearing a dozen Topics is not tagged, it is filed under everything.
export const TOPIC_NAME_MAX = 60;
export const TOPIC_COUNT_MAX = 12;

// Topics are optional on every carrier and never required: object-tag discipline is guidance
// copy in the field, because a required Topic guarantees vague ones (#87). So an absent list
// passes, and so does an empty one - it is how every Topic is taken off a carrier.
export const validateTopicNames = (value: unknown): ValidationResult => {
  if (value === undefined || value === null) return { valid: true };
  if (!Array.isArray(value)) {
    return { valid: false, error: 'Topics are a list of names.' };
  }
  if (value.length > TOPIC_COUNT_MAX) {
    return { valid: false, error: `A Topic list is at most ${TOPIC_COUNT_MAX} Topics.` };
  }
  for (const name of value) {
    if (typeof name !== 'string' || name.trim() === '') {
      return { valid: false, error: 'A Topic needs a name.' };
    }
    if (!isWithin(name, TOPIC_NAME_MAX)) {
      return { valid: false, error: `A Topic name is at most ${TOPIC_NAME_MAX} characters.` };
    }
  }
  return { valid: true };
};

// A rename carries one name, held to the same ceiling a name on a carrier is: renaming is the
// only write a Topic takes, and it is also the merge, so the name is checked here and the
// vocabulary decides afterwards whether it belongs to a Topic already (CONTEXT.md, Topic).
export const validateTopicName = (value: unknown): ValidationResult => {
  const name = sanitizeTopicName(trimmed(value));
  if (name === '') {
    return { valid: false, error: 'A Topic needs a name.' };
  }
  // Measured after trimming, the way the name is stored: a name that fits once its surrounding
  // whitespace is gone is a legal name, and refusing it would be refusing the name the user
  // would actually get.
  if (!isWithin(name, TOPIC_NAME_MAX)) {
    return { valid: false, error: `A Topic name is at most ${TOPIC_NAME_MAX} characters.` };
  }
  return { valid: true };
};

// A Link between two notes that both already exist, as the browsable panel makes it. The
// reason is held to the same rule and the same ceiling it is held to in the Permanent note
// composer, because it is the same thing: the smallest unit of the user's thinking, required
// at link time (ADR 0015).
export const validateLinkInput = (input: {
  originNoteId?: unknown;
  targetNoteId?: unknown;
  reason?: unknown;
}): ValidationResult => {
  if (!isPositiveInteger(input.originNoteId) || !isPositiveInteger(input.targetNoteId)) {
    return { valid: false, error: 'A connection needs a note at each end.' };
  }
  if (input.originNoteId === input.targetNoteId) {
    return { valid: false, error: 'A note cannot be connected to itself.' };
  }
  return validateLinkReason(input.reason);
};

// The three Answers, and nothing else: "come back sooner" was asked for and refused, because
// it is a grading verb and would introduce an interval where the design has none (ADR 0016).
const REVIEW_ANSWERS: readonly ReviewAnswerKind[] = [
  'nothing_here',
  'link_made',
  'permanent_note_written',
];

const isReviewAnswer = (value: unknown): value is ReviewAnswerKind =>
  typeof value === 'string' && (REVIEW_ANSWERS as readonly string[]).includes(value);

// An Answer, held to the Answer it claims to be. An Answer is recorded on completion rather
// than on intent (ADR 0011), so each of the two that produced something must name what it
// produced - a request that says a Link was made and names no Link is not an Answer about a
// Link - and "nothing of mine here" must name nothing, since it produced nothing.
export const validateReviewAnswerInput = (input: {
  noteId?: unknown;
  answer?: unknown;
  producedLinkId?: unknown;
  producedNoteId?: unknown;
}): ValidationResult => {
  if (!isPositiveInteger(input.noteId)) {
    return { valid: false, error: 'An Answer belongs to a note.' };
  }
  if (!isReviewAnswer(input.answer)) {
    return {
      valid: false,
      error:
        'An Answer is one of three: nothing of yours is here, a connection was made, or a Permanent note was written.',
    };
  }
  const link = isOmitted(input.producedLinkId) ? null : input.producedLinkId;
  const note = isOmitted(input.producedNoteId) ? null : input.producedNoteId;
  if (link !== null && !isPositiveInteger(link)) {
    return { valid: false, error: 'An Answer names the connection it produced.' };
  }
  if (note !== null && !isPositiveInteger(note)) {
    return { valid: false, error: 'An Answer names the Permanent note it produced.' };
  }
  if (input.answer === 'nothing_here' && (link !== null || note !== null)) {
    return { valid: false, error: 'Nothing of yours here produced nothing.' };
  }
  if (input.answer === 'link_made' && (link === null || note !== null)) {
    return { valid: false, error: 'An Answer names the connection it produced.' };
  }
  if (input.answer === 'permanent_note_written' && (note === null || link !== null)) {
    return { valid: false, error: 'An Answer names the Permanent note it produced.' };
  }
  return { valid: true };
};
