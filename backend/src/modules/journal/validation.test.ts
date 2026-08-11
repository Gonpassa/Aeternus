import { validateEntryInput, parsePagination } from './validation';

const validInput = {
  date: '2026-08-01',
  title: 'A good day',
  primaryMood: 'happy',
  specificEmotion: 'content',
  content: '<p>Hi</p>',
};

describe('validateEntryInput', () => {
  it('accepts valid input', () => {
    expect(validateEntryInput(validInput)).toEqual({ valid: true });
  });

  it('rejects a missing or malformed date', () => {
    expect(validateEntryInput({ ...validInput, date: 'not-a-date' })).toEqual({
      valid: false,
      error: 'A valid date is required.',
    });
  });

  it('rejects a missing title', () => {
    expect(validateEntryInput({ ...validInput, title: '' })).toEqual({
      valid: false,
      error: 'Title is required.',
    });
  });

  it('rejects an unknown primary mood', () => {
    expect(validateEntryInput({ ...validInput, primaryMood: 'bored' })).toEqual({
      valid: false,
      error: 'A valid primary mood is required.',
    });
  });

  it('rejects a specific emotion that does not belong to the primary mood bucket', () => {
    expect(
      validateEntryInput({ ...validInput, primaryMood: 'happy', specificEmotion: 'lonely' }),
    ).toEqual({
      valid: false,
      error: 'The specific emotion must match the selected primary mood.',
    });
  });

  it('rejects missing content', () => {
    expect(validateEntryInput({ ...validInput, content: '' })).toEqual({
      valid: false,
      error: 'Content is required.',
    });
  });
});

describe('parsePagination', () => {
  it('defaults to page 1 and pageSize 20', () => {
    expect(parsePagination({})).toEqual({ page: 1, pageSize: 20 });
  });

  it('parses valid page and pageSize from query strings', () => {
    expect(parsePagination({ page: '3', pageSize: '10' })).toEqual({ page: 3, pageSize: 10 });
  });

  it('falls back to defaults for invalid values', () => {
    expect(parsePagination({ page: '-1', pageSize: '9999' })).toEqual({ page: 1, pageSize: 20 });
  });
});
