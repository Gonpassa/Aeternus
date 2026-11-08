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

// `noteCount` and `lastNoteAt` are derived per request, never stored (#70). The recency of a
// Source's Literature notes is the only signal that it is active, and unlike a status left
// unmaintained, a derived signal cannot go stale.
export interface SourceListEntry extends Source {
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
// round trip (#72). Topics fold in with their own ticket.
export interface SourceDetailResponse {
  source: Source;
  notes: LiteratureNoteWithConnections[];
  sections: string[];
}

export interface LiteratureNoteResponse {
  note: LiteratureNote;
}

export interface SourceResponse {
  source: Source;
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
}

// One note read with its connections, for either kind. The note travels with the groups
// because a connections view is read about a note, and the caller may not be holding it.
export interface NoteConnectionsResponse {
  note: Note;
  connections: NoteConnections;
}

export interface PermanentNoteResponse {
  note: PermanentNote;
  links: Link[];
}
