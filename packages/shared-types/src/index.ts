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

export type PrimaryMood = 'happy' | 'calm' | 'sad' | 'anxious' | 'angry';

export type SpecificEmotion = string;

export const MOOD_TAXONOMY: Record<PrimaryMood, string[]> = {
  happy: ['content', 'proud', 'excited', 'grateful'],
  calm: ['peaceful', 'relaxed', 'relieved', 'secure'],
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
  page: number;
  pageSize: number;
  total: number;
}

export interface EntryRangeQuery {
  start: string;
  end: string;
}
