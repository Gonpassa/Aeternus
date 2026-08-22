import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';

const mockUseEntries = vi.fn();

vi.mock('@tanstack/react-router', () => ({
  Link: ({ to, children }: { to: string; children: ReactNode }) => <a href={to}>{children}</a>,
}));

vi.mock('./AuthProvider.tsx', () => ({
  useAuth: () => ({
    user: { id: 1, username: 'alice', email: 'alice@example.com', createdAt: '', updatedAt: '' },
  }),
}));

vi.mock('../modules/journal/api/journalHooks.ts', () => ({
  useEntries: () => mockUseEntries(),
}));

const { Dashboard } = await import('./Dashboard.tsx');

describe('Dashboard', () => {
  beforeEach(() => {
    mockUseEntries.mockReset();
    mockUseEntries.mockReturnValue({ data: { entries: [], page: 1, pageSize: 20, total: 0 } });
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
    mockUseEntries.mockReturnValue({
      data: { entries: [{ id: 1 }], page: 1, pageSize: 20, total: 3 },
    });

    render(<Dashboard />);

    expect(screen.queryByRole('link', { name: 'Start your first entry' })).not.toBeInTheDocument();
  });
});
