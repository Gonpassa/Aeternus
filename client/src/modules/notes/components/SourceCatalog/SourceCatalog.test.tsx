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

const { SourceCatalog } = await import('./SourceCatalog.tsx');

const entry = (id: number, title: string): SourceListEntry => ({
  id,
  userId: 1,
  title,
  kind: 'book',
  author: null,
  url: null,
  createdAt: '2026-09-01T10:00:00.000Z',
  updatedAt: '2026-09-01T10:00:00.000Z',
  noteCount: 0,
  lastNoteAt: null,
});

describe('SourceCatalog', () => {
  it('invites a first Source when the catalog is empty', () => {
    render(<SourceCatalog sources={[]} />);

    expect(screen.getByRole('heading', { name: 'Nothing on the shelf yet.' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Add the first Source' })).toHaveAttribute(
      'href',
      '/notes/read/new',
    );
  });

  it('renders one card per Source', () => {
    render(<SourceCatalog sources={[entry(1, 'Tristes Tropiques'), entry(2, 'The Nature of Order')]} />);

    expect(screen.getByRole('heading', { name: 'Tristes Tropiques' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'The Nature of Order' })).toBeInTheDocument();
  });

  // The API orders by most recent Literature note, with Sources that have none last, so the
  // grid renders what it is given rather than sorting it again.
  it('keeps the order the API sent', () => {
    render(<SourceCatalog sources={[entry(1, 'Second-filed'), entry(2, 'First-filed')]} />);

    const titles = screen.getAllByRole('heading').map((heading) => heading.textContent);
    expect(titles).toEqual(['Second-filed', 'First-filed']);
  });

  it('drops the empty-state invitation once there is a Source', () => {
    render(<SourceCatalog sources={[entry(1, 'Tristes Tropiques')]} />);

    expect(screen.queryByText('Nothing on the shelf yet.')).not.toBeInTheDocument();
  });
});
