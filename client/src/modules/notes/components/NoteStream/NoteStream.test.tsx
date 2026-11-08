import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ComponentProps } from 'react';
import type { LiteratureNote } from '@nee3/shared-types';
import { NoteStream } from './NoteStream.tsx';

const note = (overrides: Partial<LiteratureNote> = {}): LiteratureNote => ({
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

const renderStream = (
  notes: LiteratureNote[],
  props: Partial<ComponentProps<typeof NoteStream>> = {},
) =>
  render(
    <NoteStream
      notes={notes}
      onCorrect={props.onCorrect ?? vi.fn()}
      onDelete={props.onDelete ?? vi.fn()}
    />,
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

    await user.click(screen.getByRole('button', { name: 'Correct this note' }));

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

    await user.click(screen.getByRole('button', { name: 'Correct this note' }));
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

    await user.click(screen.getByRole('button', { name: 'Correct this note' }));
    await user.click(screen.getByRole('button', { name: 'Open question' }));
    await user.click(screen.getByRole('button', { name: 'Save' }));

    expect(onCorrect).toHaveBeenCalledWith(9, expect.objectContaining({ openQuestion: true }));
  });

  it('sends an emptied excerpt as nothing rather than as an empty value', async () => {
    const user = userEvent.setup();
    const onCorrect = vi.fn().mockResolvedValue(undefined);
    renderStream([note({ id: 9, excerpt: 'Their exact words.' })], { onCorrect });

    await user.click(screen.getByRole('button', { name: 'Correct this note' }));
    await user.clear(screen.getByLabelText("The author's words"));
    await user.click(screen.getByRole('button', { name: 'Save' }));

    expect(onCorrect).toHaveBeenCalledWith(9, expect.objectContaining({ excerpt: null }));
  });

  it('still refuses a correction that empties both halves of the Locator', async () => {
    const user = userEvent.setup();
    const onCorrect = vi.fn().mockResolvedValue(undefined);
    renderStream([note({ id: 9, section: 'Ch. 3', position: '42' })], { onCorrect });

    await user.click(screen.getByRole('button', { name: 'Correct this note' }));
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

    await user.click(screen.getByRole('button', { name: 'Correct this note' }));
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

    await user.click(screen.getByRole('button', { name: 'Correct this note' }));
    await user.click(screen.getByRole('button', { name: 'Delete this note' }));

    expect(onDelete).not.toHaveBeenCalled();
    expect(screen.getByText(/leaves the stream for good/)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Delete note' }));

    expect(onDelete).toHaveBeenCalledWith(9);
  });
});
