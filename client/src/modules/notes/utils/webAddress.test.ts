import { describe, expect, it } from 'vitest';
import { isWebAddress, normalizeWebAddress } from './webAddress.ts';

describe('normalizeWebAddress', () => {
  it.each([
    ['example.com', 'https://example.com'],
    ['www.example.com/a/b?c=d#e', 'https://www.example.com/a/b?c=d#e'],
    ['  example.com/smart  ', 'https://example.com/smart'],
    ['example.com:8080/path', 'https://example.com:8080/path'],
  ])('adds https:// to %p, which was typed without a scheme', (typed, normalized) => {
    expect(normalizeWebAddress(typed)).toBe(normalized);
  });

  it.each(['http://example.com', 'https://example.com/a', 'HTTPS://Example.com/Path'])(
    'leaves %p as it was typed',
    (typed) => {
      expect(normalizeWebAddress(typed)).toBe(typed);
    },
  );

  it('leaves another scheme alone, so it is refused rather than dressed up as https', () => {
    expect(normalizeWebAddress('ftp://example.com')).toBe('ftp://example.com');
  });

  it('leaves a blank field blank', () => {
    expect(normalizeWebAddress('   ')).toBe('');
  });
});

describe('isWebAddress', () => {
  it.each([
    'https://example.com',
    'http://example.com/a/b?c=d#e',
    'https://example.com:8080/path',
    'http://localhost:5173/notes',
  ])('accepts %p', (value) => {
    expect(isWebAddress(value)).toBe(true);
  });

  it.each([
    'ftp://example.com',
    'https://javascript:alert(1)',
    'https://mailto:someone@example.com',
    'https://not a url at all',
    'https://example',
    'example.com',
    '',
  ])('refuses %p', (value) => {
    expect(isWebAddress(value)).toBe(false);
  });
});
