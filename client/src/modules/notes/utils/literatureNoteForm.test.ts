import { describe, expect, it } from 'vitest';
import type { LiteratureNote } from '@nee3/shared-types';
import { toNoteCardValues, toNotePayload } from './literatureNoteForm.ts';

const note = (overrides: Partial<LiteratureNote> = {}): LiteratureNote => ({
  id: 1,
  userId: 1,
  kind: 'literature',
  sourceId: 7,
  body: 'Reading is not understanding.',
  section: 'Ch. 3',
  position: '42',
  excerpt: null,
  openQuestion: false,
  createdAt: '2026-09-02T10:00:00.000Z',
  updatedAt: '2026-09-02T10:00:00.000Z',
  ...overrides,
});

describe('toNoteCardValues', () => {
  it('reads a filed note back onto the card it was written on', () => {
    expect(toNoteCardValues(note({ excerpt: 'Their words.', openQuestion: true }))).toEqual({
      body: 'Reading is not understanding.',
      section: 'Ch. 3',
      // As typed: "p. N" is a rendering rule, never a stored value.
      position: '42',
      excerpt: 'Their words.',
      openQuestion: true,
    });
  });

  it('shows a field the note has none of as the empty field a blank card starts from', () => {
    expect(toNoteCardValues(note({ section: null, excerpt: null }))).toEqual(
      expect.objectContaining({ section: '', excerpt: '' }),
    );
  });
});

describe('toNotePayload', () => {
  it('sends an emptied excerpt as nothing rather than as an empty value', () => {
    const payload = toNotePayload({
      body: 'My own words.',
      section: 'Ch. 3',
      position: '42',
      excerpt: '',
      openQuestion: false,
    });

    expect(payload.excerpt).toBeNull();
  });

  it('sends an emptied Locator half as nothing, since either half alone is complete', () => {
    const payload = toNotePayload({
      body: 'My own words.',
      section: '',
      position: '42',
      excerpt: '',
      openQuestion: false,
    });

    expect(payload).toEqual({
      body: 'My own words.',
      section: null,
      position: '42',
      excerpt: null,
      openQuestion: false,
    });
  });
});
