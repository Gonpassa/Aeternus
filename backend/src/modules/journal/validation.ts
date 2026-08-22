import { PrimaryMood } from '@nee3/shared-types';

export type ValidationResult = { valid: true } | { valid: false; error: string };

const isNonEmptyString = (value: unknown): value is string =>
  typeof value === 'string' && value.trim().length > 0;

const isValidDate = (value: unknown): value is string =>
  typeof value === 'string' &&
  /^\d{4}-\d{2}-\d{2}$/.test(value) &&
  !Number.isNaN(Date.parse(value));

export const PRIMARY_MOODS: readonly PrimaryMood[] = [
  'happy',
  'calm',
  'sad',
  'anxious',
  'angry',
  'steady',
];

const isPrimaryMood = (value: unknown): value is PrimaryMood =>
  typeof value === 'string' && (PRIMARY_MOODS as readonly string[]).includes(value);

export const validateEntryInput = (input: {
  date?: unknown;
  title?: unknown;
  primaryMood?: unknown;
  specificEmotion?: unknown;
  content?: unknown;
}): ValidationResult => {
  if (!isValidDate(input.date)) {
    return { valid: false, error: 'A valid date is required.' };
  }
  if (!isNonEmptyString(input.title)) {
    return { valid: false, error: 'Title is required.' };
  }
  if (!isPrimaryMood(input.primaryMood)) {
    return { valid: false, error: 'A valid primary mood is required.' };
  }
  if (input.specificEmotion !== undefined && input.specificEmotion !== null) {
    if (typeof input.specificEmotion !== 'string' || input.specificEmotion.trim().length === 0) {
      return { valid: false, error: 'The specific emotion, if provided, cannot be blank.' };
    }
  }
  if (!isNonEmptyString(input.content)) {
    return { valid: false, error: 'Content is required.' };
  }
  return { valid: true };
};

export const normalizeSpecificEmotion = (value: unknown): string | null => {
  if (typeof value !== 'string') {
    return null;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

export type PaginationParams = { page: number; pageSize: number };

export const parsePagination = (query: {
  page?: unknown;
  pageSize?: unknown;
}): PaginationParams => {
  const page = Number(query.page);
  const pageSize = Number(query.pageSize);
  return {
    page: Number.isInteger(page) && page > 0 ? page : 1,
    pageSize: Number.isInteger(pageSize) && pageSize > 0 && pageSize <= 100 ? pageSize : 20,
  };
};

export const validateRangeQuery = (query: { start?: unknown; end?: unknown }): ValidationResult => {
  if (!isValidDate(query.start)) {
    return { valid: false, error: 'A valid start date is required.' };
  }
  if (!isValidDate(query.end)) {
    return { valid: false, error: 'A valid end date is required.' };
  }
  if (query.start > query.end) {
    return { valid: false, error: 'start must not be after end.' };
  }
  return { valid: true };
};

export type AsOfResult = { valid: true; asOf: string } | { valid: false; error: string };

const todayUTC = (): string => new Date().toISOString().slice(0, 10);

export const parseAsOf = (query: { asOf?: unknown }): AsOfResult => {
  if (query.asOf === undefined) {
    return { valid: true, asOf: todayUTC() };
  }
  if (!isValidDate(query.asOf)) {
    return { valid: false, error: 'asOf must be a valid date.' };
  }
  return { valid: true, asOf: query.asOf };
};
