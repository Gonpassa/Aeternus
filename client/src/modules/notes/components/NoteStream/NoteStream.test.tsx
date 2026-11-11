import { describe, expect, it, vi } from 'vitest';
import { AxiosError } from 'axios';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ComponentProps } from 'react';
import type { LiteratureNoteWithConnections, Topic } from '@nee3/shared-types';
import { queryWrapper } from '../../../../test/queryWrapper.tsx';
import { routerLinkStub } from '../../../../test/routerLinkStub.tsx';
import { LinkActionsProvider, type LinkActions } from '../../LinkActionsContext.tsx';

// A filed note's inherited Topic chips are links to the Topic view, and a router Link needs a
// router (#88). The stream is rendered without one, so the Link is stubbed as the anchor it
// renders as, and the component is imported once the mock is in place.
vi.mock('@tanstack/react-router', () => routerLinkStub());

const { NoteStream } = await import('./NoteStream.tsx');

const note = (
  overrides: Partial<LiteratureNoteWithConnections> = {},
): LiteratureNoteWithConnections => ({
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
  connections: { connectsTo: [], connectedFrom: [] },
  ...overrides,
});

const renderStream = (
  notes: LiteratureNoteWithConnections[],
  props: Partial<ComponentProps<typeof NoteStream>> = {},
) =>
  render(
    <NoteStream
      notes={notes}
      sourceTitle="How to Take Smart Notes"
      sourceTopics={props.sourceTopics ?? []}
      onCorrect={props.onCorrect ?? vi.fn()}
      onDelete={props.onDelete ?? vi.fn()}
      onWritePermanentNote={props.onWritePermanentNote ?? vi.fn()}
    />,
    { wrapper: queryWrapper() },
  );

describe('NoteStream', () => {
  it('says plainly that nothing has been written from the Source yet', () => {
    renderStream([]);

    expect(screen.getByText('Nothing written from this yet.')).toBeInTheDocument();
  });

  it('renders the notes in the order it was given them', () => {
    renderStream([
      note({ id: 1, body: 'Written first.' }),
      note({ id: 2, body: 'Written second.' }),
    ]);

    expect(screen.getAllByText(/^Written /).map((element) => element.textContent)).toEqual([
      'Written first.',
      'Written second.',
    ]);
  });

  it('renders the Locator as one string on the card', () => {
    renderStream([note({ section: 'Ch. 3', position: '42' })]);

    expect(screen.getByText('Ch. 3')).toBeInTheDocument();
    expect(screen.getByText('p. 42')).toBeInTheDocument();
  });

  it('keeps the line breaks the note was written with', () => {
    renderStream([note({ body: 'One thought.\n\nAnother.' })]);

    expect(screen.getByText(/One thought\./)).toHaveStyle({ whiteSpace: 'pre-wrap' });
  });

  it('shows the open-question flag on a filed card', () => {
    renderStream([note({ openQuestion: true })]);

    expect(screen.getByText('Open question')).toBeInTheDocument();
  });

  it('says nothing about an open question on a note that is not flagged', () => {
    renderStream([note()]);

    expect(screen.queryByText('Open question')).not.toBeInTheDocument();
  });

  // The author's words stay a slip under the card rather than prose mixed into the user's own.
  it('reveals the excerpt on demand', async () => {
    const user = userEvent.setup();
    renderStream([note({ excerpt: 'Their exact words.' })]);

    expect(screen.queryByText('Their exact words.')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: "The author's words" }));

    expect(screen.getByText('Their exact words.')).toBeInTheDocument();
  });

  it('offers nothing to reveal on a note with no excerpt', () => {
    renderStream([note()]);

    expect(screen.queryByRole('button', { name: /author's words/ })).not.toBeInTheDocument();
  });

  it('opens the card itself for correction, with its own text in the fields', async () => {
    const user = userEvent.setup();
    renderStream([
      note({ body: 'Reading is not understanding.', section: 'Ch. 3', position: '42' }),
    ]);

    await user.click(screen.getByRole('button', { name: 'Edit this note' }));

    expect(screen.getByLabelText('Note')).toHaveValue('Reading is not understanding.');
    expect(screen.getByLabelText('Section')).toHaveValue('Ch. 3');
    // As typed, not as rendered: "p. N" is a rendering rule over a digits-only position.
    expect(screen.getByLabelText('Position')).toHaveValue('42');
  });

  it('hands the correction back for the note it belongs to', async () => {
    const user = userEvent.setup();
    const onCorrect = vi.fn().mockResolvedValue(undefined);
    renderStream([note({ id: 9, body: 'A first draft.', section: null, position: '42' })], {
      onCorrect,
    });

    await user.click(screen.getByRole('button', { name: 'Edit this note' }));
    await user.clear(screen.getByLabelText('Note'));
    await user.type(screen.getByLabelText('Note'), 'A corrected draft.');
    await user.click(screen.getByRole('button', { name: 'Save' }));

    expect(onCorrect).toHaveBeenCalledWith(9, {
      body: 'A corrected draft.',
      section: null,
      position: '42',
      excerpt: null,
      openQuestion: false,
    });
  });

  // The flag is set while writing or afterwards; #82 left the second half to the edit path.
  it('flags a filed note as an open question after the fact', async () => {
    const user = userEvent.setup();
    const onCorrect = vi.fn().mockResolvedValue(undefined);
    renderStream([note({ id: 9, openQuestion: false })], { onCorrect });

    await user.click(screen.getByRole('button', { name: 'Edit this note' }));
    await user.click(screen.getByRole('button', { name: 'Open question' }));
    await user.click(screen.getByRole('button', { name: 'Save' }));

    expect(onCorrect).toHaveBeenCalledWith(9, expect.objectContaining({ openQuestion: true }));
  });

  it('sends an emptied excerpt as nothing rather than as an empty value', async () => {
    const user = userEvent.setup();
    const onCorrect = vi.fn().mockResolvedValue(undefined);
    renderStream([note({ id: 9, excerpt: 'Their exact words.' })], { onCorrect });

    await user.click(screen.getByRole('button', { name: 'Edit this note' }));
    await user.clear(screen.getByLabelText("The author's words"));
    await user.click(screen.getByRole('button', { name: 'Save' }));

    expect(onCorrect).toHaveBeenCalledWith(9, expect.objectContaining({ excerpt: null }));
  });

  it('still refuses a correction that empties both halves of the Locator', async () => {
    const user = userEvent.setup();
    const onCorrect = vi.fn().mockResolvedValue(undefined);
    renderStream([note({ id: 9, section: 'Ch. 3', position: '42' })], { onCorrect });

    await user.click(screen.getByRole('button', { name: 'Edit this note' }));
    await user.clear(screen.getByLabelText('Section'));
    await user.clear(screen.getByLabelText('Position'));
    await user.click(screen.getByRole('button', { name: 'Save' }));

    expect(onCorrect).not.toHaveBeenCalled();
    expect(
      screen.getByText('A note needs a section or a position - either one will do.'),
    ).toBeInTheDocument();
  });

  it('leaves the card as it was when the correction is abandoned', async () => {
    const user = userEvent.setup();
    const onCorrect = vi.fn();
    renderStream([note({ body: 'As filed.' })], { onCorrect });

    await user.click(screen.getByRole('button', { name: 'Edit this note' }));
    await user.clear(screen.getByLabelText('Note'));
    await user.type(screen.getByLabelText('Note'), 'A change never saved.');
    await user.click(screen.getByRole('button', { name: 'Cancel' }));

    expect(onCorrect).not.toHaveBeenCalled();
    expect(screen.getByText('As filed.')).toBeInTheDocument();
  });

  it('deletes a note only once the deletion is confirmed', async () => {
    const user = userEvent.setup();
    const onDelete = vi.fn().mockResolvedValue(undefined);
    renderStream([note({ id: 9, section: 'Ch. 3', position: '42' })], { onDelete });

    await user.click(screen.getByRole('button', { name: 'Edit this note' }));
    await user.click(screen.getByRole('button', { name: 'Delete this note' }));

    expect(onDelete).not.toHaveBeenCalled();
    expect(screen.getByText(/leaves the stream for good/)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Delete note' }));

    expect(onDelete).toHaveBeenCalledWith(9);
  });

  // ADR 0014: deleting a note takes its Links with it, so it is refused while it is some
  // Permanent note's only Link - and the refusal names that note, which is what makes it
  // actionable. It has to be legible where the deletion was asked for (#86).
  it('shows the server’s refusal beside the deletion it refused', async () => {
    const user = userEvent.setup();
    const refusal =
      'Deleting this note would leave “Writing is how an idea is tested.” with nothing linked to it. Link it elsewhere first, or delete it.';
    const onDelete = vi.fn().mockRejectedValue(
      new AxiosError('Conflict', undefined, undefined, undefined, {
        status: 409,
        statusText: 'Conflict',
        data: { error: refusal },
        headers: {},
        config: { headers: {} as never },
      }),
    );
    renderStream([note({ id: 9 })], { onDelete });

    await user.click(screen.getByRole('button', { name: 'Edit this note' }));
    await user.click(screen.getByRole('button', { name: 'Delete this note' }));
    await user.click(screen.getByRole('button', { name: 'Delete note' }));

    expect(await screen.findByText(refusal)).toBeInTheDocument();
    // The dialog stays open: the note is still filed, and so is the choice.
    expect(screen.getByRole('button', { name: 'Delete note' })).toBeInTheDocument();
  });

  // The reading page is where a Permanent note is written: the user's own thinking happens
  // while reading, not only later (#67).
  it('offers to write a Permanent note from each filed card', () => {
    renderStream([note()]);

    expect(screen.getByRole('button', { name: 'Write a Permanent note' })).toBeInTheDocument();
  });

  // What is written from a reading starts out about what the reading is about (#104).
  it("opens the composer with the Source's Topics already on the new note", async () => {
    const user = userEvent.setup();
    renderStream([note()], {
      sourceTopics: [
        { id: 3, userId: 1, name: 'Christianity', createdAt: '2026-09-01T10:00:00.000Z' },
      ],
    });

    await user.click(screen.getByRole('button', { name: 'Write a Permanent note' }));

    const composer = screen.getByRole('form', { name: 'Write a Permanent note' });
    expect(
      within(composer).getByRole('button', { name: 'Remove the Topic Christianity' }),
    ).toBeInTheDocument();
  });

  it('shows what has been written from a note, in the inbound group', () => {
    renderStream([
      note({
        connections: {
          connectsTo: [],
          connectedFrom: [
            {
              link: {
                id: 1,
                originNoteId: 2,
                targetNoteId: 1,
                reason: 'This is the claim that note was circling.',
                targetReason: null,
                createdAt: '2026-09-03T10:00:00.000Z',
                updatedAt: '2026-09-03T10:00:00.000Z',
              },
              other: {
                id: 2,
                userId: 1,
                kind: 'permanent',
                title: 'Writing is how an idea is tested.',
                body: 'The claim itself.',
                createdAt: '2026-09-03T10:00:00.000Z',
                updatedAt: '2026-09-03T10:00:00.000Z',
              },
              sourceTitle: null,
            },
          ],
        },
      }),
    ]);

    expect(screen.getByText('Linked from')).toBeInTheDocument();
    expect(screen.getByText('Writing is how an idea is tested.')).toBeInTheDocument();
    expect(screen.getByText('This is the claim that note was circling.')).toBeInTheDocument();
    expect(screen.queryByText('Links to')).not.toBeInTheDocument();
  });
  // A Literature note carries no Topics of its own: it shows the Source's, named as the Source's,
  // and offers no way to add one (CONTEXT.md, Topic).
  it("shows the Source's Topics on a filed note, read-only", () => {
    const topic: Topic = {
      id: 1,
      userId: 1,
      name: 'Attention',
      createdAt: '2026-09-01T10:00:00.000Z',
    };
    renderStream([note()], { sourceTopics: [topic] });

    expect(
      screen.getByRole('list', { name: 'Topics inherited from the Source' }),
    ).toBeInTheDocument();
    expect(screen.getByText('From the Source')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Add a Topic/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Remove the Topic/ })).not.toBeInTheDocument();
  });

  it('says nothing about Topics when the Source carries none', () => {
    renderStream([note()]);

    expect(screen.queryByText('From the Source')).not.toBeInTheDocument();
  });
});

// The Link affordance sits on the Literature note itself rather than only inside the Permanent
// note composer: a Link's required reason is the smallest unit of the user's own thought, and a
// Permanent note is what gets written when that reason outgrows one line (#67, ADR 0015).
describe('NoteStream, with the Link affordances provided', () => {
  const linkActions: LinkActions = {
    link: vi.fn().mockResolvedValue(undefined),
    editReason: vi.fn().mockResolvedValue(undefined),
    removeLink: vi.fn().mockResolvedValue(undefined),
  };

  it('offers to connect each filed card to another note, alongside writing one', async () => {
    const user = userEvent.setup();
    render(
      <LinkActionsProvider value={linkActions}>
        <NoteStream
          notes={[note()]}
          sourceTitle="How to Take Smart Notes"
          sourceTopics={[]}
          onCorrect={vi.fn()}
          onDelete={vi.fn()}
          onWritePermanentNote={vi.fn()}
        />
      </LinkActionsProvider>,
      { wrapper: queryWrapper() },
    );

    expect(screen.getByRole('button', { name: 'Write a Permanent note' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Link to another note' }));

    // The same panel every linking path uses, opened on the note it was reached from.
    expect(screen.getByLabelText('Search your notes')).toBeInTheDocument();
  });

  it('does not offer it where the affordances are not provided', () => {
    renderStream([note()]);

    expect(screen.queryByRole('button', { name: 'Link to another note' })).not.toBeInTheDocument();
  });
});
