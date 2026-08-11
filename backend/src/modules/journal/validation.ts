import { MOOD_TAXONOMY, PrimaryMood } from '@nee3/shared-types';

export type ValidationResult = { valid: true } | { valid: false; error: string };

const isNonEmptyString = (value: unknown): value is string =>
  typeof value === 'string' && value.trim().length > 0;

const isValidDate = (value: unknown): value is string =>
  typeof value === 'string' &&
  /^\d{4}-\d{2}-\d{2}$/.test(value) &&
  !Number.isNaN(Date.parse(value));

const isPrimaryMood = (value: unknown): value is PrimaryMood =>
  typeof value === 'string' && Object.prototype.hasOwnProperty.call(MOOD_TAXONOMY, value);

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
  const bucket: string[] = MOOD_TAXONOMY[input.primaryMood];
  if (typeof input.specificEmotion !== 'string' || !bucket.includes(input.specificEmotion)) {
    return { valid: false, error: 'The specific emotion must match the selected primary mood.' };
  }
  if (!isNonEmptyString(input.content)) {
    return { valid: false, error: 'Content is required.' };
  }
  return { valid: true };
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
