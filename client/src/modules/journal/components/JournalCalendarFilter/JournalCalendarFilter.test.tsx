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

    const { container } = render(
      <JournalCalendarFilter selectedRange={{}} onRangeChange={vi.fn()} />,
    );

    expect(container.querySelector(`[data-iso="${toIso(sampleDate)}"]`)).not.toBeDisabled();
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

  it('shows the entry count from the selected range, not the two-month grid data', () => {
    mockedUseEntriesByRange.mockReturnValue({
      data: [fakeEntry('2026-08-01'), fakeEntry('2026-08-15'), fakeEntry('2026-09-01')],
    } as ReturnType<typeof journalHooks.useEntriesByRange>);

    const day = new Date(2026, 7, 15);
    render(
      <JournalCalendarFilter
        selectedRange={{ from: day, to: day }}
        onRangeChange={vi.fn()}
        entryCount={1}
      />,
    );

    expect(screen.getByText(/Showing entries Aug 15, 2026 · 1 entries/)).toBeInTheDocument();
  });
});

describe('formatRangeLabel', () => {
  it('formats a single-day range', () => {
    const day = new Date(2026, 7, 15);
    expect(formatRangeLabel({ from: day, to: day })).toBe('Showing entries Aug 15, 2026');
  });

  it('formats a multi-day range', () => {
    expect(formatRangeLabel({ from: new Date(2026, 7, 1), to: new Date(2026, 7, 5) })).toBe(
      'Showing entries Aug 1 – Aug 5, 2026',
    );
  });

  it('returns an empty string when there is no range', () => {
    expect(formatRangeLabel({})).toBe('');
  });
});
