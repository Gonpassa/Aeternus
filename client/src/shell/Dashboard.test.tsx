import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';

const mockUseJournalSummary = vi.fn();

vi.mock('@tanstack/react-router', () => ({
  Link: ({ to, children }: { to: string; children: ReactNode }) => <a href={to}>{children}</a>,
}));

vi.mock('./AuthProvider.tsx', () => ({
  useAuth: () => ({
    user: { id: 1, username: 'alice', email: 'alice@example.com', createdAt: '', updatedAt: '' },
  }),
}));

vi.mock('../modules/journal/api/journalHooks.ts', () => ({
  useJournalSummary: () => mockUseJournalSummary(),
}));

const { Dashboard } = await import('./Dashboard.tsx');

const emptySummary = {
  data: {
    recentEntries: [],
    streak: { current: 0 },
    moodSnapshot: { happy: 0, calm: 0, sad: 0, anxious: 0, angry: 0, steady: 0 },
  },
  isLoading: false,
};

describe('Dashboard', () => {
  beforeEach(() => {
    mockUseJournalSummary.mockReset();
    mockUseJournalSummary.mockReturnValue(emptySummary);
  });

  it('renders the greeting header with the username', () => {
    render(<Dashboard />);

    expect(screen.getByText('Good to see you, alice.')).toBeInTheDocument();
  });

  it('renders the journal widget from the registry', () => {
    render(<Dashboard />);

    expect(screen.getAllByText('Journal').length).toBeGreaterThan(0);
    expect(screen.getByRole('link', { name: '+ New entry' })).toHaveAttribute(
      'href',
      '/journal/new',
    );
  });

  it('shows the empty-state CTA for a zero-entry user', () => {
    render(<Dashboard />);

    expect(screen.getByRole('link', { name: 'Start your first entry' })).toBeInTheDocument();
  });

  it('does not show the empty-state CTA once entries exist', () => {
    mockUseJournalSummary.mockReturnValue({
      data: {
        recentEntries: [{ id: 1, date: '2026-08-01', title: 'A good day', primaryMood: 'happy' }],
        streak: { current: 1 },
        moodSnapshot: { happy: 1, calm: 0, sad: 0, anxious: 0, angry: 0, steady: 0 },
      },
      isLoading: false,
    });

    render(<Dashboard />);

    expect(screen.queryByRole('link', { name: 'Start your first entry' })).not.toBeInTheDocument();
  });
});
