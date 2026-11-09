import { describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactNode } from 'react';
import type {
  Source,
  TopicDetailResponse,
  TopicListEntry,
  TopicPermanentNote,
} from '@nee3/shared-types';

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

const { TopicView } = await import('./TopicView.tsx');

const topic = (
  id: number,
  name: string,
  permanentNoteCount = 0,
  sourceCount = 0,
): TopicListEntry => ({
  id,
  userId: 1,
  name,
  createdAt: '2026-09-01T10:00:00.000Z',
  permanentNoteCount,
  sourceCount,
});

const permanentNote = (id: number, title: string, linkCount: number): TopicPermanentNote => ({
  id,
  userId: 1,
  kind: 'permanent',
  title,
  body: 'The idea written out.',
  linkCount,
  createdAt: '2026-09-01T10:00:00.000Z',
  updatedAt: '2026-09-01T10:00:00.000Z',
});

const source = (id: number, title: string): Source => ({
  id,
  userId: 1,
  title,
  kind: 'book',
  author: 'Sönke Ahrens',
  url: null,
  createdAt: '2026-09-01T10:00:00.000Z',
  updatedAt: '2026-09-01T10:00:00.000Z',
});

const detail = (overrides: Partial<TopicDetailResponse> = {}): TopicDetailResponse => ({
  topic: topic(1, 'Attention', 2, 1),
  permanentNotes: [
    permanentNote(10, 'Attention is the scarce resource.', 3),
    permanentNote(11, 'What you attend to is what you think with.', 1),
  ],
  sources: [source(20, 'How to Take Smart Notes')],
  ...overrides,
});

const noop = async () => {};

describe('TopicView', () => {
  it('names the Topic with its carrier counts', () => {
    render(<TopicView detail={detail()} vocabulary={[]} onRename={noop} onDelete={noop} />);

    expect(screen.getByRole('heading', { name: 'Attention' })).toBeInTheDocument();
    expect(screen.getByText('2 Permanent notes · 1 Source')).toBeInTheDocument();
  });

  // Most-linked first: the note most connected to the box is the front door (#88).
  it('lists the Permanent notes in the order given, then the Sources', () => {
    render(<TopicView detail={detail()} vocabulary={[]} onRename={noop} onDelete={noop} />);

    const ideas = screen.getByRole('list', { name: 'Permanent notes carrying this Topic' });
    expect(Array.from(ideas.querySelectorAll('h3')).map((heading) => heading.textContent)).toEqual([
      'Attention is the scarce resource.',
      'What you attend to is what you think with.',
    ]);
    expect(screen.getByText('3 connections')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /How to Take Smart Notes/ })).toHaveAttribute(
      'href',
      '/notes/read/20',
    );
  });

  it('says a Topic nobody carries is still a word in the vocabulary', () => {
    render(
      <TopicView
        detail={detail({ topic: topic(1, 'Attention'), permanentNotes: [], sources: [] })}
        vocabulary={[]}
        onRename={noop}
        onDelete={noop}
      />,
    );

    expect(screen.getByText(/Nothing carries this Topic yet/)).toBeInTheDocument();
    expect(
      screen.queryByRole('list', { name: 'Permanent notes carrying this Topic' }),
    ).not.toBeInTheDocument();
  });

  it('renames the Topic without a confirmation when the name is new', async () => {
    const onRename = vi.fn(async () => {});
    render(
      <TopicView
        detail={detail()}
        vocabulary={[topic(1, 'Attention', 2, 1)]}
        onRename={onRename}
        onDelete={noop}
      />,
    );

    await userEvent.click(screen.getByRole('button', { name: 'Rename' }));
    const field = screen.getByLabelText('Topic');
    await userEvent.clear(field);
    await userEvent.type(field, 'Focus');
    await userEvent.click(screen.getByRole('button', { name: 'Rename Topic' }));

    await waitFor(() => expect(onRename).toHaveBeenCalledWith('Focus'));
  });

  // Renaming into a name that already exists *is* the merge, and it confirms first, naming the
  // carrier counts (CONTEXT.md, Topic).
  it('confirms a merge, naming both Topics’ carrier counts', async () => {
    const onRename = vi.fn(async () => {});
    render(
      <TopicView
        detail={detail()}
        vocabulary={[topic(1, 'Attention', 2, 1), topic(2, 'Focus', 4, 3)]}
        onRename={onRename}
        onDelete={noop}
      />,
    );

    await userEvent.click(screen.getByRole('button', { name: 'Rename' }));
    const field = screen.getByLabelText('Topic');
    await userEvent.clear(field);
    await userEvent.type(field, 'focus');
    await userEvent.click(screen.getByRole('button', { name: 'Rename Topic' }));

    const confirmation = screen.getByText(/folds into/);
    expect(confirmation).toHaveTextContent(
      '“Attention” (2 Permanent notes · 1 Source) folds into “Focus” (4 Permanent notes · 3 Sources).',
    );
    expect(onRename).not.toHaveBeenCalled();

    await userEvent.click(screen.getByRole('button', { name: 'Merge Topics' }));

    await waitFor(() => expect(onRename).toHaveBeenCalledWith('focus'));
  });

  it('confirms a deletion by naming what it detaches, and that no note goes', async () => {
    const onDelete = vi.fn(async () => {});
    render(<TopicView detail={detail()} vocabulary={[]} onRename={noop} onDelete={onDelete} />);

    await userEvent.click(screen.getByRole('button', { name: 'Delete' }));

    expect(screen.getByText(/leaves the vocabulary/)).toBeInTheDocument();
    expect(screen.getByText(/No note and no Source is deleted/)).toBeInTheDocument();
    expect(onDelete).not.toHaveBeenCalled();

    await userEvent.click(screen.getByRole('button', { name: 'Delete Topic' }));

    await waitFor(() => expect(onDelete).toHaveBeenCalled());
  });
});
