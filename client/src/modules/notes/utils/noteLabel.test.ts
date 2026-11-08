import { describe, expect, it } from 'vitest';
import type { LiteratureNote, NoteConnection, PermanentNote } from '@nee3/shared-types';
import { formatLocator, formatPosition, noteLabel, openingWords } from './noteLabel.ts';

const literature = (overrides: Partial<LiteratureNote> = {}): LiteratureNote => ({
  id: 1,
  userId: 1,
  kind: 'literature',
  sourceId: 1,
  body: 'Writing is the thinking, not the record of it.',
  section: 'Ch. 3',
  position: '42',
  excerpt: null,
  openQuestion: false,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
  ...overrides,
});

const permanent = (overrides: Partial<PermanentNote> = {}): PermanentNote => ({
  id: 2,
  userId: 1,
  kind: 'permanent',
  title: 'Writing is how an idea is tested.',
  body: 'The claim itself.',
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
  ...overrides,
});

const connection = (
  other: NoteConnection['other'],
  sourceTitle: string | null,
): NoteConnection => ({
  link: {
    id: 1,
    originNoteId: 2,
    targetNoteId: 1,
    reason: 'Why they belong together.',
    targetReason: null,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  },
  other,
  sourceTitle,
});

describe('formatPosition', () => {
  it('renders a digits-only position as a page and leaves any other notation alone', () => {
    expect(formatPosition('42')).toBe('p. 42');
    expect(formatPosition('12:30')).toBe('12:30');
    expect(formatPosition('loc. 418')).toBe('loc. 418');
  });
});

describe('formatLocator', () => {
  it('joins the two halves, and reads either half alone as a whole Locator', () => {
    expect(formatLocator({ section: 'Ch. 3', position: '42' })).toBe('Ch. 3 · p. 42');
    expect(formatLocator({ section: 'Intro', position: null })).toBe('Intro');
    expect(formatLocator({ section: null, position: '12:30' })).toBe('12:30');
  });
});

describe('openingWords', () => {
  it('keeps a short body whole and collapses the line breaks it was typed with', () => {
    expect(openingWords('First line.\n\nSecond line.')).toBe('First line. Second line.');
  });

  it('cuts a long body on a word boundary rather than mid-word', () => {
    const cut = openingWords(`${'word '.repeat(30)}end`);

    expect(cut).toMatch(/…$/);
    expect(cut.length).toBeLessThanOrEqual(81);
    expect(cut).not.toMatch(/wo…$/);
  });

  it('drops the sentence punctuation the cut lands on instead of printing it before the ellipsis', () => {
    const cut = openingWords(`${'word '.repeat(14)}sentence. And then a second sentence follows.`);

    expect(cut).toMatch(/sentence…$/);
  });
});

describe('noteLabel', () => {
  it('names a Permanent note by the claim it states', () => {
    expect(noteLabel(connection(permanent(), null))).toEqual({
      heading: 'Writing is how an idea is tested.',
      detail: null,
    });
  });

  it('names a Literature note by Source title, Locator and opening words', () => {
    expect(noteLabel(connection(literature(), 'How to Take Smart Notes'))).toEqual({
      heading: 'How to Take Smart Notes · Ch. 3 · p. 42',
      detail: 'Writing is the thinking, not the record of it.',
    });
  });

  it('falls back to the Locator alone when the Source title is missing', () => {
    expect(noteLabel(connection(literature({ section: null }), null)).heading).toBe('p. 42');
  });
});
