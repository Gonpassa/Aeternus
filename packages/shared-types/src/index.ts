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
