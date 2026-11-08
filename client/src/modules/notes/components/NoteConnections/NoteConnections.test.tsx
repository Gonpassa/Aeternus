import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { Link, Note, NoteConnection } from '@nee3/shared-types';
import { NoteConnections } from './NoteConnections.tsx';

const useNoteConnections = vi.fn();

vi.mock('../../api/noteHooks.ts', () => ({
  useNoteConnections: (noteId: number, enabled: boolean) => useNoteConnections(noteId, enabled),
}));

const link = (overrides: Partial<Link> = {}): Link => ({
  id: 1,
  originNoteId: 2,
  targetNoteId: 1,
  reason: 'This is the claim that note was circling.',
  targetReason: null,
  createdAt: '2026-09-03T10:00:00.000Z',
  updatedAt: '2026-09-03T10:00:00.000Z',
  ...overrides,
});

const permanent = (overrides: Partial<Extract<Note, { kind: 'permanent' }>> = {}): Note => ({
  id: 2,
  userId: 1,
  kind: 'permanent',
  title: 'Writing is how an idea is tested.',
  body: 'The claim itself.',
  createdAt: '2026-09-03T10:00:00.000Z',
  updatedAt: '2026-09-03T10:00:00.000Z',
  ...overrides,
});

const literature = (overrides: Partial<Extract<Note, { kind: 'literature' }>> = {}): Note => ({
  id: 1,
  userId: 1,
  kind: 'literature',
  sourceId: 7,
  body: 'Reading is not understanding.',
  section: 'Ch. 3',
  position: '42',
  excerpt: null,
  openQuestion: false,
  createdAt: '2026-09-02T10:00:00.000Z',
  updatedAt: '2026-09-02T10:00:00.000Z',
  ...overrides,
});

const connection = (overrides: Partial<NoteConnection> = {}): NoteConnection => ({
  link: link(),
  other: permanent(),
  sourceTitle: null,
  ...overrides,
});

const EMPTY = { connectsTo: [], connectedFrom: [] };

describe('NoteConnections', () => {
  it('says nothing at all about a note with no Links', () => {
    const { container } = render(<NoteConnections connections={EMPTY} noteId={1} />);

    expect(container).toBeEmptyDOMElement();
  });

  it('groups by direction, and leaves out a group with nothing in it', () => {
    render(
      <NoteConnections
        connections={{ connectsTo: [], connectedFrom: [connection()] }}
        noteId={1}
      />,
    );

    expect(screen.getByText('Connected from')).toBeInTheDocument();
    expect(screen.queryByText('Connects to')).not.toBeInTheDocument();
  });

  it('names a Permanent note at the other end by the claim it states, with the reason under it', () => {
    render(
      <NoteConnections
        connections={{ connectsTo: [], connectedFrom: [connection()] }}
        noteId={1}
      />,
    );

    expect(screen.getByText('Permanent note')).toBeInTheDocument();
    expect(screen.getByText('Writing is how an idea is tested.')).toBeInTheDocument();
    expect(screen.getByText('This is the claim that note was circling.')).toBeInTheDocument();
  });

  // CONTEXT.md, Literature note: it has no title, so the Source title, the Locator and the
  // note's opening words are what name it.
  it('names a Literature note at the other end by Source title, Locator and opening words', () => {
    render(
      <NoteConnections
        connections={{
          connectsTo: [
            connection({
              link: link({ originNoteId: 2, targetNoteId: 1 }),
              other: literature(),
              sourceTitle: 'How to Take Smart Notes',
            }),
          ],
          connectedFrom: [],
        }}
        noteId={2}
      />,
    );

    expect(screen.getByText('Literature note')).toBeInTheDocument();
    expect(screen.getByText('How to Take Smart Notes · Ch. 3 · p. 42')).toBeInTheDocument();
    expect(screen.getByText('Reading is not understanding.')).toBeInTheDocument();
  });

  // ADR 0013: each reason is attributed to the direction that produced it, so a row read from
  // the target end shows the origin's line as well as its own.
  it('shows the reason from each end once the other end has linked back', () => {
    render(
      <NoteConnections
        connections={{
          connectsTo: [],
          connectedFrom: [
            connection({
              link: link({ reason: 'What the origin said.', targetReason: 'What this end said.' }),
            }),
          ],
        }}
        noteId={1}
      />,
    );

    expect(screen.getByText('What the origin said.')).toBeInTheDocument();
    expect(screen.getByText('What this end said.')).toBeInTheDocument();
  });

  it('reads the note at the other end in turn, on request', async () => {
    const user = userEvent.setup();
    useNoteConnections.mockReturnValue({
      data: {
        note: permanent(),
        connections: {
          connectsTo: [connection({ other: literature(), sourceTitle: 'How to Take Smart Notes' })],
          connectedFrom: [],
        },
      },
      isError: false,
    });
    render(
      <NoteConnections
        connections={{ connectsTo: [], connectedFrom: [connection()] }}
        noteId={1}
      />,
    );

    // Nothing is asked for until the row is opened.
    expect(useNoteConnections).toHaveBeenCalledWith(2, false);

    await user.click(screen.getByRole('button', { name: 'Its connections' }));

    expect(useNoteConnections).toHaveBeenCalledWith(2, true);
    expect(screen.getByText('How to Take Smart Notes · Ch. 3 · p. 42')).toBeInTheDocument();
    // One level of reaching through: the row behind a row offers no further opening, which is
    // what #85 and #88 are for.
    expect(screen.queryByRole('button', { name: 'Its connections' })).not.toBeInTheDocument();
  });
});
