import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import * as journalHooks from '../../api/journalHooks.ts';
import { JournalCalendarFilter, formatRangeLabel } from './JournalCalendarFilter.tsx';

vi.mock('../../api/journalHooks.ts', () => ({
  useEntriesByRange: vi.fn(),
}));

const mockedUseEntriesByRange = vi.mocked(journalHooks.useEntriesByRange);

const toIso = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const fakeEntry = (date: string) => ({
  id: 1,
  userId: 1,
  date,
  title: 'Entry',
  primaryMood: 'happy' as const,
  specificEmotion: null,
  content: '<p>Hi</p>',
  createdAt: '2026-08-01T00:00:00.000Z',
  updatedAt: '2026-08-01T00:00:00.000Z',
});

describe('JournalCalendarFilter', () => {
  it('marks days that have entries in the visible months', () => {
    const today = new Date();
    const sampleDate = new Date(today.getFullYear(), today.getMonth(), 10);
    mockedUseEntriesByRange.mockReturnValue({
      data: [fakeEntry(toIso(sampleDate))],
    } as ReturnType<typeof journalHooks.useEntriesByRange>);

    render(<JournalCalendarFilter selectedRange={{}} onRangeChange={vi.fn()} />);

    expect(screen.getByRole('button', { name: toIso(sampleDate) })).not.toBeDisabled();
  });

  it('shows a clear-filter link only when a range is active', () => {
    mockedUseEntriesByRange.mockReturnValue({ data: [] } as unknown as ReturnType<
      typeof journalHooks.useEntriesByRange
    >);

    const { rerender } = render(
      <JournalCalendarFilter selectedRange={{}} onRangeChange={vi.fn()} />,
    );
    expect(screen.queryByText('Clear filter')).not.toBeInTheDocument();

    const day = new Date(2026, 7, 1);
    rerender(
      <JournalCalendarFilter selectedRange={{ from: day, to: day }} onRangeChange={vi.fn()} />,
    );
    expect(screen.getByText('Clear filter')).toBeInTheDocument();
  });
});

describe('formatRangeLabel', () => {
  it('formats a single-day range', () => {
    const day = new Date(2026, 7, 15);
    expect(formatRangeLabel({ from: day, to: day })).toBe('Showing entries 2026-08-15');
  });

  it('formats a multi-day range', () => {
    expect(formatRangeLabel({ from: new Date(2026, 7, 1), to: new Date(2026, 7, 5) })).toBe(
      'Showing entries 2026-08-01 – 2026-08-05',
    );
  });

  it('returns an empty string when there is no range', () => {
    expect(formatRangeLabel({})).toBe('');
  });
});
