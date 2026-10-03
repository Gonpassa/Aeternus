import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import type { SourceListEntry } from '@nee3/shared-types';

vi.mock('@tanstack/react-router', () => ({
  Link: ({
    to,
    params,
    children,
  }: {
    to: string;
    params?: Record<string, string>;
    children: ReactNode;
  }) => (
    <a href={Object.entries(params ?? {}).reduce((path, [key, v]) => path.replace(`$${key}`, v), to)}>
      {children}
    </a>
  ),
}));

const { SourceCard } = await import('./SourceCard.tsx');

const source = (overrides: Partial<SourceListEntry> = {}): SourceListEntry => ({
  id: 7,
  userId: 1,
  title: 'How to Take Smart Notes',
  kind: 'book',
  author: 'Sonke Ahrens',
  url: null,
  createdAt: '2026-09-01T10:00:00.000Z',
  updatedAt: '2026-09-01T10:00:00.000Z',
  noteCount: 0,
  lastNoteAt: null,
  ...overrides,
});

describe('SourceCard', () => {
  it('shows the kind, the title and the author', () => {
    render(<SourceCard source={source()} />);

    expect(screen.getByText('Book')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'How to Take Smart Notes' })).toBeInTheDocument();
    expect(screen.getByText('Sonke Ahrens')).toBeInTheDocument();
  });

  // A Source without an author is not missing anything, so the line is absent rather than
  // reporting its own absence.
  it('omits the author line entirely when there is no author', () => {
    render(<SourceCard source={source({ author: null })} />);

    expect(screen.queryByText(/no author/i)).not.toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'How to Take Smart Notes' })).toBeInTheDocument();
  });

  it('leads to the Source its own reading page', () => {
    render(<SourceCard source={source({ id: 42 })} />);

    expect(screen.getByRole('link')).toHaveAttribute('href', '/notes/read/42');
  });

  it('counts the notes written from the Source', () => {
    render(<SourceCard source={source({ noteCount: 3, lastNoteAt: '2026-09-20T08:00:00.000Z' })} />);

    expect(screen.getByText('3 notes')).toBeInTheDocument();
  });

  it('uses the singular for a single note', () => {
    render(<SourceCard source={source({ noteCount: 1, lastNoteAt: '2026-09-20T08:00:00.000Z' })} />);

    expect(screen.getByText('1 note')).toBeInTheDocument();
  });

  it('dates the last note when there is one', () => {
    render(<SourceCard source={source({ noteCount: 2, lastNoteAt: '2026-09-20T08:00:00.000Z' })} />);

    expect(screen.getByText('Last note Sep 20, 2026')).toBeInTheDocument();
  });

  // Not "Not started": that would describe a lifecycle a Source does not have.
  it('invites a first note when none has been written', () => {
    render(<SourceCard source={source()} />);

    expect(screen.getByText('No notes')).toBeInTheDocument();
    expect(screen.getByText('Nothing written from this yet')).toBeInTheDocument();
  });

  it('shows no reading status anywhere', () => {
    render(<SourceCard source={source()} />);

    expect(screen.queryByText(/reading|finished|to read|in progress/i)).not.toBeInTheDocument();
  });
});
