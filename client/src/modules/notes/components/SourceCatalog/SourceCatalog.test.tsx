import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactNode } from 'react';
import type { SourceListEntry, Topic } from '@nee3/shared-types';

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
    <a
      href={Object.entries(params ?? {}).reduce((path, [key, v]) => path.replace(`$${key}`, v), to)}
    >
      {children}
    </a>
  ),
}));

const { SourceCatalog } = await import('./SourceCatalog.tsx');

const topic = (id: number, name: string): Topic => ({
  id,
  userId: 1,
  name,
  createdAt: '2026-09-01T10:00:00.000Z',
});

const entry = (id: number, title: string, topics: Topic[] = []): SourceListEntry => ({
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
  topics,
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
    render(
      <SourceCatalog sources={[entry(1, 'Tristes Tropiques'), entry(2, 'The Nature of Order')]} />,
    );

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

  it('offers only the Topics some Source on the shelf carries, alphabetically', () => {
    render(
      <SourceCatalog
        sources={[
          entry(1, 'Tristes Tropiques', [topic(3, 'Myth')]),
          entry(2, 'The Nature of Order', [topic(1, 'Attention')]),
        ]}
      />,
    );

    const names = screen
      .getAllByRole('button')
      .map((button) => button.textContent)
      .filter((name) => name === 'Myth' || name === 'Attention');
    expect(names).toEqual(['Attention', 'Myth']);
  });

  it('says nothing about Topics when no Source carries one', () => {
    render(<SourceCatalog sources={[entry(1, 'Tristes Tropiques')]} />);

    expect(screen.queryByText('Topics')).not.toBeInTheDocument();
  });

  it('narrows the shelf to one Topic, and puts it all back when pressed again', async () => {
    const user = userEvent.setup();
    render(
      <SourceCatalog
        sources={[
          entry(1, 'Tristes Tropiques', [topic(3, 'Myth')]),
          entry(2, 'The Nature of Order', []),
        ]}
      />,
    );

    await user.click(screen.getByRole('button', { name: 'Myth' }));

    expect(screen.getByRole('heading', { name: 'Tristes Tropiques' })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'The Nature of Order' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Myth' })).toHaveAttribute('aria-pressed', 'true');

    await user.click(screen.getByRole('button', { name: 'Myth' }));

    expect(screen.getByRole('heading', { name: 'The Nature of Order' })).toBeInTheDocument();
  });

  // The shelf is not empty, this way of looking at it is - so a filter that matches nothing must
  // not read as the first-run invitation to add a Source.
  it('says the filter matched nothing rather than that the shelf is empty', async () => {
    const user = userEvent.setup();
    const { rerender } = render(
      <SourceCatalog sources={[entry(1, 'Tristes Tropiques', [topic(3, 'Myth')])]} />,
    );

    await user.click(screen.getByRole('button', { name: 'Myth' }));
    // The Source that carried the pressed Topic stops carrying it - a correction made elsewhere,
    // arriving while the filter is still held.
    rerender(<SourceCatalog sources={[entry(1, 'Tristes Tropiques', [])]} />);

    expect(screen.getByText('Nothing on the shelf carries that Topic.')).toBeInTheDocument();
    expect(screen.queryByText('Nothing on the shelf yet.')).not.toBeInTheDocument();
  });

  it('drops the empty-state invitation once there is a Source', () => {
    render(<SourceCatalog sources={[entry(1, 'Tristes Tropiques')]} />);

    expect(screen.queryByText('Nothing on the shelf yet.')).not.toBeInTheDocument();
  });
});
