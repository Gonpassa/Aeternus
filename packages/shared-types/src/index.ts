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

export interface DreamDetailResponse {
  dream: Dream;
  anchors: AnchorWithBeats[];
}

export interface CreateEmotionalBeatRequest {
  label: string;
}

export type UpdateEmotionalBeatRequest = CreateEmotionalBeatRequest;
