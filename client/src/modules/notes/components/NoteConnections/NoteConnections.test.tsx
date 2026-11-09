import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { AxiosError } from 'axios';
import userEvent from '@testing-library/user-event';
import type { Link, Note, NoteConnection, NoteConnections as Groups } from '@nee3/shared-types';
import { NoteConnections } from './NoteConnections.tsx';
import { LinkActionsProvider, type LinkActions } from '../../LinkActionsContext.tsx';

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
    // what #88 is for.
    expect(screen.queryByRole('button', { name: 'Its connections' })).not.toBeInTheDocument();
  });
});

// A Link is editable and removable from either of its ends, and those affordances arrive with
// the provider rather than with the row: a connections view read without one - a row reached
// from another row, a surface that only reads notes - is read rather than edited.
describe('NoteConnections, with the Link affordances provided', () => {
  const actions = (overrides: Partial<LinkActions> = {}): LinkActions => ({
    link: vi.fn().mockResolvedValue(undefined),
    editReason: vi.fn().mockResolvedValue(undefined),
    removeLink: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  });

  const renderWith = (value: LinkActions, connections: Groups, noteId: number) =>
    render(
      <LinkActionsProvider value={value}>
        <NoteConnections connections={connections} noteId={noteId} />
      </LinkActionsProvider>,
    );

  it('offers nothing to change without a provider', () => {
    render(
      <NoteConnections
        connections={{ connectsTo: [], connectedFrom: [connection()] }}
        noteId={1}
      />,
    );

    expect(screen.queryByRole('button', { name: 'Rewrite the reason' })).not.toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Remove this connection' }),
    ).not.toBeInTheDocument();
  });

  // ADR 0013: the reason is edited in place by the end that wrote it, and `fromNoteId` is what
  // says which end is speaking.
  it('rewrites this end’s reason in place', async () => {
    const user = userEvent.setup();
    const value = actions();
    renderWith(
      value,
      {
        connectsTo: [],
        connectedFrom: [connection({ link: link({ originNoteId: 1, targetNoteId: 2 }) })],
      },
      1,
    );

    await user.click(screen.getByRole('button', { name: 'Rewrite the reason' }));
    const field = screen.getByLabelText('Why these belong together');
    // The field opens with the line as it stands: this is a rewrite, not a blank field.
    expect(field).toHaveValue('This is the claim that note was circling.');
    await user.clear(field);
    await user.type(field, 'What it was really about.');
    await user.click(screen.getByRole('button', { name: 'Save the reason' }));

    expect(value.editReason).toHaveBeenCalledWith(1, 1, 'What it was really about.');
  });

  it('refuses an emptied reason, since a Link cannot exist without one', async () => {
    const user = userEvent.setup();
    const value = actions();
    renderWith(
      value,
      {
        connectsTo: [],
        connectedFrom: [connection({ link: link({ originNoteId: 1, targetNoteId: 2 }) })],
      },
      1,
    );

    await user.click(screen.getByRole('button', { name: 'Rewrite the reason' }));
    await user.clear(screen.getByLabelText('Why these belong together'));
    await user.click(screen.getByRole('button', { name: 'Save the reason' }));

    expect(
      screen.getByText('Every connection needs a line saying why the two belong together.'),
    ).toBeInTheDocument();
    expect(value.editReason).not.toHaveBeenCalled();
  });

  it('offers no rewrite of a line this end did not write', () => {
    const value = actions();
    // Read from the target end, which has said nothing back: the origin's reason is on the row
    // and is not this note's to restate.
    renderWith(
      value,
      {
        connectsTo: [],
        connectedFrom: [connection({ link: link({ originNoteId: 2, targetNoteId: 1 }) })],
      },
      1,
    );

    expect(screen.queryByRole('button', { name: 'Rewrite the reason' })).not.toBeInTheDocument();
    // The connection itself is still removable from this end.
    expect(screen.getByRole('button', { name: 'Remove this connection' })).toBeInTheDocument();
  });

  it('confirms before removing a connection, then removes it', async () => {
    const user = userEvent.setup();
    const value = actions();
    renderWith(value, { connectsTo: [], connectedFrom: [connection()] }, 1);

    await user.click(screen.getByRole('button', { name: 'Remove this connection' }));

    expect(value.removeLink).not.toHaveBeenCalled();

    await user.click(screen.getByRole('button', { name: 'Remove connection' }));

    expect(value.removeLink).toHaveBeenCalledWith(1);
  });

  // ADR 0014: a removal that would leave a Permanent note with no Links is refused, and the
  // refusal names the note it protects - so it has to be legible where the removal was asked
  // for, with that note still in view.
  it('shows the server’s refusal beside the removal it refused', async () => {
    const user = userEvent.setup();
    const refusal =
      'Removing this connection would leave “Writing is how an idea is tested.” with nothing connected to it. Connect it elsewhere first, or delete it.';
    const value = actions({
      removeLink: vi.fn().mockRejectedValue(
        new AxiosError('Conflict', undefined, undefined, undefined, {
          status: 409,
          statusText: 'Conflict',
          data: { error: refusal },
          headers: {},
          config: { headers: {} as never },
        }),
      ),
    });
    renderWith(value, { connectsTo: [], connectedFrom: [connection()] }, 1);

    await user.click(screen.getByRole('button', { name: 'Remove this connection' }));
    await user.click(screen.getByRole('button', { name: 'Remove connection' }));

    expect(await screen.findByText(refusal)).toBeInTheDocument();
    // The dialog stays open: the connection is still there, and so is the choice.
    expect(screen.getByRole('button', { name: 'Remove connection' })).toBeInTheDocument();
  });
});
