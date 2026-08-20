import {
  validateEntryInput,
  validateRangeQuery,
  parsePagination,
  normalizeSpecificEmotion,
} from './validation';

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

  it('accepts steady as a valid primary mood', () => {
    expect(
      validateEntryInput({ ...validInput, primaryMood: 'steady', specificEmotion: null }),
    ).toEqual({ valid: true });
  });

  it('rejects an unknown primary mood', () => {
    expect(validateEntryInput({ ...validInput, primaryMood: 'bored' })).toEqual({
      valid: false,
      error: 'A valid primary mood is required.',
    });
  });

  it('accepts input with no specific emotion at all', () => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { specificEmotion, ...rest } = validInput;
    expect(validateEntryInput(rest)).toEqual({ valid: true });
  });

  it('accepts a null specific emotion', () => {
    expect(validateEntryInput({ ...validInput, specificEmotion: null })).toEqual({ valid: true });
  });

  it('accepts an arbitrary custom specific emotion', () => {
    expect(validateEntryInput({ ...validInput, specificEmotion: 'bittersweet' })).toEqual({
      valid: true,
    });
  });

  it('rejects a whitespace-only specific emotion', () => {
    expect(validateEntryInput({ ...validInput, specificEmotion: '   ' })).toEqual({
      valid: false,
      error: 'The specific emotion, if provided, cannot be blank.',
    });
  });

  it('rejects missing content', () => {
    expect(validateEntryInput({ ...validInput, content: '' })).toEqual({
      valid: false,
      error: 'Content is required.',
    });
  });
});

describe('normalizeSpecificEmotion', () => {
  it('trims surrounding whitespace', () => {
    expect(normalizeSpecificEmotion('  wistful  ')).toBe('wistful');
  });

  it('returns null for undefined, null, or blank input', () => {
    expect(normalizeSpecificEmotion(undefined)).toBeNull();
    expect(normalizeSpecificEmotion(null)).toBeNull();
    expect(normalizeSpecificEmotion('   ')).toBeNull();
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

describe('validateRangeQuery', () => {
  it('accepts a valid range', () => {
    expect(validateRangeQuery({ start: '2026-08-01', end: '2026-08-31' })).toEqual({
      valid: true,
    });
  });

  it('accepts a single-day range', () => {
    expect(validateRangeQuery({ start: '2026-08-01', end: '2026-08-01' })).toEqual({
      valid: true,
    });
  });

  it('rejects a missing start', () => {
    expect(validateRangeQuery({ end: '2026-08-31' })).toEqual({
      valid: false,
      error: 'A valid start date is required.',
    });
  });

  it('rejects a malformed end', () => {
    expect(validateRangeQuery({ start: '2026-08-01', end: 'not-a-date' })).toEqual({
      valid: false,
      error: 'A valid end date is required.',
    });
  });

  it('rejects start after end', () => {
    expect(validateRangeQuery({ start: '2026-08-31', end: '2026-08-01' })).toEqual({
      valid: false,
      error: 'start must not be after end.',
    });
  });
});
