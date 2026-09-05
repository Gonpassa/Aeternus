import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';

const mockUseJournalSummary = vi.fn();

vi.mock('@tanstack/react-router', () => ({
  Link: ({ to, children }: { to: string; children: ReactNode }) => <a href={to}>{children}</a>,
}));

vi.mock('../../api/journalHooks.ts', () => ({
  useJournalSummary: () => mockUseJournalSummary(),
}));

const { JournalWidget } = await import('./JournalWidget.tsx');

describe('JournalWidget', () => {
  beforeEach(() => {
    mockUseJournalSummary.mockReset();
  });

  it('shows a loading state while the request is in flight', () => {
    mockUseJournalSummary.mockReturnValue({ data: undefined, isPending: true });

    render(<JournalWidget />);

    expect(screen.getByRole('status')).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Start your first entry' })).not.toBeInTheDocument();
  });

  it('renders recent entries, streak, and mood snapshot for a populated summary', () => {
    mockUseJournalSummary.mockReturnValue({
      data: {
        recentEntries: [
          { id: 1, date: '2026-08-01', title: 'A good day', primaryMood: 'happy' },
          { id: 2, date: '2026-07-31', title: 'A quiet one', primaryMood: 'calm' },
        ],
        streak: { current: 2 },
        moodSnapshot: { happy: 1, calm: 1, sad: 0, anxious: 0, angry: 0, steady: 0 },
      },
      isPending: false,
    });

    render(<JournalWidget />);

    expect(screen.getByText('A good day')).toBeInTheDocument();
    expect(screen.getByText('A quiet one')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();
    expect(screen.getByText(/day streak/)).toBeInTheDocument();
    expect(screen.getByText(/Happy/)).toBeInTheDocument();
    expect(screen.getByText(/Calm/)).toBeInTheDocument();
    expect(screen.queryByText(/Sad/)).not.toBeInTheDocument();
  });

  it('shows the empty-state CTA when there are zero recent entries', () => {
    mockUseJournalSummary.mockReturnValue({
      data: {
        recentEntries: [],
        streak: { current: 0 },
        moodSnapshot: { happy: 0, calm: 0, sad: 0, anxious: 0, angry: 0, steady: 0 },
      },
      isPending: false,
    });

    render(<JournalWidget />);

    expect(screen.getByRole('link', { name: 'Start your first entry' })).toBeInTheDocument();
  });
});
