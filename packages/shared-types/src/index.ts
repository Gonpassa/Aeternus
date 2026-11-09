export interface AuthUser {
  id: number;
  username: string;
  email: string;
  createdAt: string;
  updatedAt: string;
}

export interface RegisterRequest {
  username: string;
  email: string;
  password: string;
}

export interface LoginRequest {
  username: string;
  password: string;
}

export interface AuthResponse {
  user: AuthUser;
}

export interface ApiErrorResponse {
  error: string;
}

export type PrimaryMood = 'happy' | 'calm' | 'sad' | 'anxious' | 'angry' | 'steady';

export type SpecificEmotion = string;

export const MOOD_TAXONOMY: Record<PrimaryMood, string[]> = {
  happy: ['content', 'proud', 'excited', 'grateful'],
  calm: ['peaceful', 'relaxed', 'relieved', 'secure'],
  steady: ['ordinary', 'settled', 'unremarkable', 'quiet'],
  sad: ['lonely', 'disappointed', 'hurt', 'grieving'],
  anxious: ['nervous', 'overwhelmed', 'insecure', 'worried'],
  angry: ['frustrated', 'irritated', 'resentful', 'jealous'],
};

export interface Entry {
  id: number;
  userId: number;
  date: string;
  title: string;
  primaryMood: PrimaryMood;
  specificEmotion: SpecificEmotion | null;
  content: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateEntryRequest {
  date: string;
  title: string;
  primaryMood: PrimaryMood;
  specificEmotion: SpecificEmotion | null;
  content: string;
}

export type UpdateEntryRequest = CreateEntryRequest;

export interface EntryListResponse {
  entries: Entry[];
}

export interface EntryDetailResponse {
  entry: Entry;
  nextEntryId: number | null;
  previousEntryId: number | null;
}

export interface EntryRangeQuery {
  start: string;
  end: string;
}

export interface JournalSummaryResponse {
  recentEntries: Array<Pick<Entry, 'id' | 'date' | 'title' | 'primaryMood'>>;
  streak: { current: number };
  moodSnapshot: Record<PrimaryMood, number>;
}

export interface Dream {
  id: number;
  userId: number;
  date: string;
  narrative: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateDreamRequest {
  date: string;
  narrative: string;
}

export interface DreamListResponse {
  dreams: Dream[];
}

export type UpdateDreamRequest = CreateDreamRequest;

// The dashboard's Dream Journal card. `reEncounter` is the single Dream currently eligible
// for Re-encounter (see CONTEXT.md and ADR 0010) - no Anchor, no Analysis pass, recorded at
// least seven nights ago - or null when nothing qualifies. The full narrative comes back
// rather than a server-truncated snippet, so truncation stays one client-side rule; the card
// shows the Dream's own `date`, which is why `createdAt` is absent.
export interface DreamSummaryResponse {
  hasAnyDreams: boolean;
  reEncounter: Pick<Dream, 'id' | 'date' | 'narrative'> | null;
}

export interface Anchor {
  id: number;
  dreamId: number;
  createdAt: string;
}

export interface EmotionalBeat {
  id: number;
  anchorId: number;
  label: string;
  createdAt: string;
  updatedAt: string;
}

export interface AnchorWithBeats extends Anchor {
  emotionalBeats: EmotionalBeat[];
}

export interface CreateEmotionalBeatRequest {
  label: string;
}

export type UpdateEmotionalBeatRequest = CreateEmotionalBeatRequest;

// Named DreamSymbol (not Symbol) to avoid colliding with the ES global.
export interface DreamSymbol {
  id: number;
  userId: number;
  name: string;
  createdAt: string;
}

export interface SymbolListResponse {
  symbols: DreamSymbol[];
}

export interface SymbolAttachment {
  id: number;
  symbolId: number;
  anchorId: number;
  createdAt: string;
}

export type AssociationKind = 'personal' | 'cultural';

export interface Association {
  id: number;
  anchorId: number;
  symbolAttachmentId: number | null;
  content: string;
  kind: AssociationKind;
  createdAt: string;
  updatedAt: string;
}

// A symbol attachment as the Analysis page consumes it: joined with its Symbol's
// display name and carrying its Associations.
export interface SymbolAttachmentDetail extends SymbolAttachment {
  symbolName: string;
  associations: Association[];
}

export interface CreateSymbolAttachmentRequest {
  name: string;
}

export interface CreateAssociationRequest {
  content: string;
  kind?: AssociationKind;
  symbolAttachmentId?: number | null;
}

export interface UpdateAssociationRequest {
  content: string;
  kind?: AssociationKind;
}

export type AnalysisPassType = 'analytic' | 'synthetic';

export interface AnalysisPass {
  id: number;
  dreamId: number;
  anchorId: number | null;
  type: AnalysisPassType;
  content: string;
  createdAt: string;
}

export interface CreateAnalysisPassRequest {
  type: AnalysisPassType;
  content: string;
  anchorId?: number | null;
}

export interface AnchorWithAttachments extends AnchorWithBeats {
  // Associations attached directly to this Anchor, without naming a Symbol - rendered
  // above the Symbol tags below (issue #52).
  associations: Association[];
  symbolAttachments: SymbolAttachmentDetail[];
}

export interface DreamDetailResponse {
  dream: Dream;
  anchors: AnchorWithAttachments[];
  analysisPasses: AnalysisPass[];
}

// A cross-cutting label carried by a Source or a Permanent note, never a container
// (CONTEXT.md, Topic). One vocabulary per user, unique on the lowercased name, created by
// typing a new one - the Symbol vocabulary's shape, in its own table, because a Symbol and a
// Topic mean different things even when they are spelled the same.
export interface Topic {
  id: number;
  userId: number;
  name: string;
  createdAt: string;
}

// A Topic as the vocabulary is read back, with how many carriers wear it. The counts travel
// with every read rather than only with the index, because they are what a Topic is worth
// knowing at a glance - and a Topic nobody carries any more is a real row with zeroes on it
// rather than an absence (CONTEXT.md, Topic).
export interface TopicListEntry extends Topic {
  permanentNoteCount: number;
  sourceCount: number;
}

export interface TopicListResponse {
  topics: TopicListEntry[];
}

// A Permanent note as the Topic view lists it: with the number of Links at either end of it,
// which is the order the list is in. Link count is the uncurated front door - the note most
// connected to the box sits first - rather than a score shown for its own sake (#88).
export interface TopicPermanentNote extends PermanentNote {
  linkCount: number;
}

// The Topic view's payload: the Topic itself, the Permanent notes carrying it most-linked
// first, and then the Sources carrying it. Individual Literature notes are deliberately
// absent - they inherit their Source's Topics and stay reachable through their Source, and
// listing them here would reproduce the flood the research named (CONTEXT.md, Topic view).
export interface TopicDetailResponse {
  topic: TopicListEntry;
  permanentNotes: TopicPermanentNote[];
  sources: Source[];
}

// Renaming is the only write a Topic takes, and it is also the merge: a name that already
// belongs to another Topic folds the two together rather than being refused (CONTEXT.md,
// Topic). There is no separate merge request.
export interface RenameTopicRequest {
  name: string;
  // A merge is destructive in a way a rename is not - one of the two Topics leaves the
  // vocabulary - so the server performs it only when the request says the merge was agreed to.
  // Without this the confirmation would be advisory: a client that had not managed to read the
  // vocabulary could not tell a rename from a merge, and would fold two Topics together without
  // ever asking (#88).
  merge?: boolean;
}

// What a rename that turned out to be a merge is answered with when the request did not agree
// to one: the Topic the name already belongs to, so the client can confirm against the real
// carrier counts and send the rename again with `merge`.
export interface TopicMergeConflictResponse {
  error: string;
  mergeTarget: TopicListEntry;
}

// `merged` says which of the two things the rename turned out to be, so the client can report
// it: false renamed the Topic in place, true folded it into the Topic that already had the
// name, and `topic` is the one that survived either way.
export interface RenameTopicResponse {
  topic: TopicListEntry;
  merged: boolean;
}

// Topics travel as names rather than ids on every write, because typing a name is how a Topic
// is created: the name is resolved against the vocabulary case-insensitively, so "water"
// attaches the existing "Water" and a genuinely new name is added. The array is the whole set
// the carrier should end up with - an empty one detaches every Topic - which is the same
// whole-payload rule the rest of a Source follows (#83).
export type TopicNames = string[];

// A Source has no lifecycle: no reading status, no "finished" flag (CONTEXT.md, Source).
// `kind` is a label only - it changes no fields, so changing it strands nothing.
export const SOURCE_KINDS = ['book', 'article', 'video', 'other'] as const;

export type SourceKind = (typeof SOURCE_KINDS)[number];

export interface Source {
  id: number;
  userId: number;
  title: string;
  kind: SourceKind;
  author: string | null;
  url: string | null;
  createdAt: string;
  updatedAt: string;
}

// A Source as it is read back, with the Topics it carries. They ride with the Source wherever
// it is sent rather than being fetched per card: a Source's Topics are part of what it is, and
// the catalog filters on them (CONTEXT.md, Topic).
export interface SourceWithTopics extends Source {
  topics: Topic[];
}

// `noteCount` and `lastNoteAt` are derived per request, never stored (#70). The recency of a
// Source's Literature notes is the only signal that it is active, and unlike a status left
// unmaintained, a derived signal cannot go stale.
export interface SourceListEntry extends SourceWithTopics {
  noteCount: number;
  lastNoteAt: string | null;
}

// A Source is editable in place after the fact, kind included: `kind` is a label only, so
// changing it strands no field (#83). The payload is the whole Source rather than a patch of
// it, which is what lets clearing the author or the link mean "there is none".
export type UpdateSourceRequest = CreateSourceRequest;

export interface SourceListResponse {
  sources: SourceListEntry[];
}

export interface CreateSourceRequest {
  title: string;
  kind: SourceKind;
  author?: string | null;
  url?: string | null;
  // Optional, and never required: object-tag discipline - tag a thing only when it is *about*
  // that thing - is guidance copy in the field rather than a constraint, because a required
  // Topic guarantees vague ones (#87). Omitted means the Source keeps no Topics.
  topicNames?: TopicNames;
}

// Both note kinds are one table behind a `kind` discriminator (ADR 0012); the client sees it
// as a discriminated union, so it gets exhaustiveness where the database has CHECKs.
export interface NoteBase {
  id: number;
  userId: number;
  // Plain text, in a Textarea, rendered as written (ADR 0017). Line breaks the user typed are
  // the one piece of structure the field carries.
  body: string;
  createdAt: string;
  updatedAt: string;
}

export interface LiteratureNote extends NoteBase {
  kind: 'literature';
  sourceId: number;
  // The two halves of the Locator. At least one is non-empty; either alone is complete.
  // Rendering them as one string ("Ch. 3 · p. 42", a digits-only position as "p. N") is a
  // client-side rule over these two fields - `position` is stored exactly as typed.
  section: string | null;
  position: string | null;
  // The author's exact words, never merged into the body (CONTEXT.md, Excerpt).
  excerpt: string | null;
  openQuestion: boolean;
}

export interface PermanentNote extends NoteBase {
  kind: 'permanent';
  title: string;
}

export type Note = LiteratureNote | PermanentNote;

export interface CreateLiteratureNoteRequest {
  body: string;
  section?: string | null;
  position?: string | null;
  excerpt?: string | null;
  openQuestion?: boolean;
}

// A filed note is fully editable after capture - body, excerpt, both Locator halves and the
// open-question flag - because writing it closed-book is a discipline at the moment of
// capture, not a constraint on the stored text (CONTEXT.md, Literature note). As with a
// Source, the payload is the whole note, so an emptied excerpt is stored as no excerpt.
export type UpdateLiteratureNoteRequest = CreateLiteratureNoteRequest;

// A Link as the client sees it. `reason` is the origin end's, written when the Link was made
// and required; `targetReason` is the other end's, present only once that end has linked back
// (ADR 0013, ADR 0015). A null `targetReason` is a fact about the Link - nobody has linked
// back - rather than missing data.
export interface Link {
  id: number;
  originNoteId: number;
  targetNoteId: number;
  reason: string;
  targetReason: string | null;
  createdAt: string;
  updatedAt: string;
}

// One row of a connections view. The note at the other end travels with the Link, because a
// row has to name it: a Permanent note by its title, a Literature note - which has none - by
// its Source's title, its Locator and its opening words, which is why `sourceTitle` rides
// along with the note itself (CONTEXT.md, Literature note).
export interface NoteConnection {
  link: Link;
  other: Note;
  sourceTitle: string | null;
}

// The two direction groups every note's connections are read in. "Connects to" is the Links
// this note made, "Connected from" the Links made to it; on a Literature note the inbound
// group is what the user has built from that reading.
export interface NoteConnections {
  connectsTo: NoteConnection[];
  connectedFrom: NoteConnection[];
}

// A Literature note as the reading page receives it: the note plus the connections view it is
// read with, folded into the page's one payload rather than fetched per card.
export interface LiteratureNoteWithConnections extends LiteratureNote {
  connections: NoteConnections;
}

// The reading page's payload, in one request: the Source, its notes oldest-first with their
// connections, and the distinct sections of those notes for the tab's suggestions. `sections`
// is folded in here rather than given its own endpoint so capture never waits on a second
// round trip (#72). The Source carries its Topics, which its Literature notes inherit: there is
// no per-note Topic list in this payload because a Literature note has none of its own
// (CONTEXT.md, Topic).
export interface SourceDetailResponse {
  source: SourceWithTopics;
  notes: LiteratureNoteWithConnections[];
  sections: string[];
}

export interface LiteratureNoteResponse {
  note: LiteratureNote;
}

export interface SourceResponse {
  source: SourceWithTopics;
}

// A target picked in the composer, with the line saying why the two notes belong together. The
// reason travels with the target rather than being collected afterwards: it is required at
// link time, and a target picked without one blocks the save exactly as a missing Link does
// (ADR 0015).
export interface LinkDraft {
  targetNoteId: number;
  reason: string;
}

// A Permanent note and its first Links in one request, because they are created in one
// transaction: a Permanent note cannot exist without a Link at any moment, so there is no
// endpoint that creates a bare one and no save-and-link-later (ADR 0014). An empty `links` is
// rejected rather than accepted as a note to be connected later.
export interface CreatePermanentNoteRequest {
  title: string;
  body: string;
  links: LinkDraft[];
  // Optional here as on a Source. A Permanent note is the one note kind that carries its own
  // Topics: anything worth a Topic of its own is an idea, not a reading note (CONTEXT.md, Topic).
  topicNames?: TopicNames;
}

// One note read with its connections, for either kind. The note travels with the groups
// because a connections view is read about a note, and the caller may not be holding it.
export interface NoteConnectionsResponse {
  note: Note;
  connections: NoteConnections;
}

// A Permanent note read back with the Topics it carries, as a Source is read back with its own.
export interface PermanentNoteWithTopics extends PermanentNote {
  topics: Topic[];
}

export interface PermanentNoteResponse {
  note: PermanentNoteWithTopics;
  links: Link[];
}

// The notes that share a Topic with one note, which is the link panel's middle tier: it sits
// between the same-Source notes above it and full-text search below (#85, #87). Each note
// travels with the Topics that put it in this list and, for a Literature note, its Source's
// title, so a row is readable without a second fetch.
export interface TopicRelatedNote {
  note: Note;
  sourceTitle: string | null;
  topics: Topic[];
}

export interface TopicRelatedNotesResponse {
  notes: TopicRelatedNote[];
}

// One note offered as a Link target by the browsable panel, carrying everything a row needs
// to be readable without a second fetch: the note itself, its Source's title where it has one,
// and the Link that already connects it to the note being linked from. A non-null
// `existingLink` is what the panel shows instead of offering to make a second Link, since
// there is at most one per unordered pair (ADR 0013).
export interface LinkTargetCandidate {
  note: Note;
  sourceTitle: string | null;
  existingLink: Link | null;
}

// The panel's browsable tiers, in the order it reads them. `sameSource` is this Source's other
// Literature notes, offered without the user having to recall any wording; `results` is the
// full-text tier, empty until something is typed. The Topic tier sits between them and is read
// separately, through the Topics endpoint #87 shipped. Linking must not depend on remembering
// how an older note was worded, which is why browsing comes first and search second (#67).
export interface LinkTargetsResponse {
  sameSource: LinkTargetCandidate[];
  results: LinkTargetCandidate[];
  // Every Link this note is already an end of, in either direction. The tiers above carry
  // their own, but the Topic tier is read from a different endpoint (#87), which knows about
  // Topics and nothing about Links - so the panel marks those rows from this list. There is at
  // most one Link per unordered pair, so the note at the other end identifies it (ADR 0013).
  existingLinks: Link[];
}

// A Link between two notes that both already exist - the panel's own write, distinct from the
// Permanent note composer's, where the note and its Links are created together (ADR 0014).
// `originNoteId` is the end making the Link, so it is also the end the reason is attributed to.
export interface CreateLinkRequest {
  originNoteId: number;
  targetNoteId: number;
  reason: string;
}

// A reason edited in place by the end that wrote it: `fromNoteId` says which end is speaking,
// and the server writes the column that end owns - `reason` for the origin, `targetReason` for
// the target (ADR 0013).
export interface UpdateLinkReasonRequest {
  fromNoteId: number;
  reason: string;
}

export interface LinkResponse {
  link: Link;
}
