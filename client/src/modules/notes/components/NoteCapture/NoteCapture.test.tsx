import { describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { NoteCapture } from './NoteCapture.tsx';

const renderCard = (overrides: { sections?: string[]; onFile?: () => Promise<void> } = {}) => {
  const onFile = overrides.onFile ?? vi.fn().mockResolvedValue(undefined);
  render(<NoteCapture sections={overrides.sections ?? []} onFile={onFile} />);
  return { onFile };
};

const file = () => screen.getByRole('button', { name: 'File it' });

describe('NoteCapture', () => {
  it('is a card to write on rather than a form: a tab, a catalog number and a face', () => {
    renderCard();

    expect(screen.getByLabelText('Section')).toBeInTheDocument();
    expect(screen.getByLabelText('Position')).toBeInTheDocument();
    expect(screen.getByLabelText('Note')).toBeInTheDocument();
  });

  // ADR 0017: no rich-text editor in this module, and nothing a toolbar would hang off.
  it('writes the body in a plain textarea, with no editor toolbar', () => {
    renderCard();

    expect(screen.getByLabelText('Note').tagName).toBe('TEXTAREA');
    expect(screen.queryByRole('toolbar')).not.toBeInTheDocument();
  });

  it('starts with the position focused, which is where writing a note starts', () => {
    renderCard();

    expect(screen.getByLabelText('Position')).toHaveFocus();
  });

  it('files a note with the Locator and the body as typed', async () => {
    const user = userEvent.setup();
    const { onFile } = renderCard();

    await user.type(screen.getByLabelText('Section'), 'Ch. 3');
    await user.type(screen.getByLabelText('Position'), '42');
    await user.type(screen.getByLabelText('Note'), 'Reading is not understanding.');
    await user.click(file());

    await waitFor(() =>
      expect(onFile).toHaveBeenCalledWith({
        body: 'Reading is not understanding.',
        section: 'Ch. 3',
        position: '42',
        excerpt: null,
        openQuestion: false,
      }),
    );
  });

  it('files a note from one half of the Locator alone', async () => {
    const user = userEvent.setup();
    const { onFile } = renderCard();

    await user.type(screen.getByLabelText('Position'), '42');
    await user.type(screen.getByLabelText('Note'), 'A point.');
    await user.click(file());

    await waitFor(() =>
      expect(onFile).toHaveBeenCalledWith(
        expect.objectContaining({ section: null, position: '42' }),
      ),
    );
  });

  it('refuses a note with neither half of the Locator, and says which', async () => {
    const user = userEvent.setup();
    const { onFile } = renderCard();

    await user.type(screen.getByLabelText('Note'), 'A point from nowhere.');
    await user.click(file());

    expect(
      await screen.findByText('A note needs a section or a position - either one will do.'),
    ).toBeInTheDocument();
    expect(onFile).not.toHaveBeenCalled();
  });

  it("refuses a note with nothing of the user's own in it", async () => {
    const user = userEvent.setup();
    const { onFile } = renderCard();

    await user.type(screen.getByLabelText('Position'), '42');
    await user.click(file());

    expect(await screen.findByText('A note needs a few words of your own.')).toBeInTheDocument();
    expect(onFile).not.toHaveBeenCalled();
  });

  // The whole point of writing on the card: the next note costs nothing the reader does not
  // have to spend. The tab stays set, the position clears, and the position takes the focus.
  it('hands back a blank card with the section kept and the position cleared and focused', async () => {
    const user = userEvent.setup();
    renderCard();

    await user.type(screen.getByLabelText('Section'), 'Ch. 3');
    await user.type(screen.getByLabelText('Position'), '42');
    await user.type(screen.getByLabelText('Note'), 'A first point.');
    await user.click(file());

    await waitFor(() => expect(screen.getByLabelText('Position')).toHaveValue(''));
    expect(screen.getByLabelText('Section')).toHaveValue('Ch. 3');
    expect(screen.getByLabelText('Note')).toHaveValue('');
    expect(screen.getByLabelText('Position')).toHaveFocus();
  });

  it('keeps what was written when filing fails', async () => {
    const user = userEvent.setup();
    renderCard({ onFile: vi.fn().mockRejectedValue(new Error('offline')) });

    await user.type(screen.getByLabelText('Position'), '42');
    await user.type(screen.getByLabelText('Note'), 'A point worth keeping.');
    await user.click(file());

    await waitFor(() => expect(file()).toBeEnabled());
    expect(screen.getByLabelText('Note')).toHaveValue('A point worth keeping.');
    expect(screen.getByLabelText('Position')).toHaveValue('42');
  });

  it("sets the section from this Source's earlier sections in one tap", async () => {
    const user = userEvent.setup();
    renderCard({ sections: ['Ch. 2', 'Ch. 1'] });

    await user.click(screen.getByRole('button', { name: 'Ch. 1' }));

    expect(screen.getByLabelText('Section')).toHaveValue('Ch. 1');
  });

  it('opens on the section the most recent note was filed under', () => {
    renderCard({ sections: ['Ch. 2', 'Ch. 1'] });

    expect(screen.getByLabelText('Section')).toHaveValue('Ch. 2');
  });

  it('stops offering the section the tab is already set to', async () => {
    const user = userEvent.setup();
    renderCard({ sections: ['Ch. 2', 'Ch. 1'] });

    expect(screen.queryByRole('button', { name: 'Ch. 2' })).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Ch. 1' }));

    expect(screen.queryByRole('button', { name: 'Ch. 1' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Ch. 2' })).toBeInTheDocument();
  });

  it('offers no sections for a Source nothing has been written from', () => {
    renderCard();

    expect(screen.getAllByRole('button').map((button) => button.textContent)).toEqual([
      "Add the author's words",
      'Open question',
      'File it',
    ]);
  });

  // The author's words are a slip tucked under the card, not an empty field on its face.
  it('reveals the excerpt only on demand, and files it alongside the body', async () => {
    const user = userEvent.setup();
    const { onFile } = renderCard();

    expect(screen.queryByLabelText("The author's words")).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: "Add the author's words" }));
    await user.type(screen.getByLabelText("The author's words"), 'Their exact words.');
    await user.type(screen.getByLabelText('Position'), '42');
    await user.type(screen.getByLabelText('Note'), 'My own words.');
    await user.click(file());

    await waitFor(() =>
      expect(onFile).toHaveBeenCalledWith(
        expect.objectContaining({ body: 'My own words.', excerpt: 'Their exact words.' }),
      ),
    );
  });

  it('tucks the slip away again with the card it belonged to', async () => {
    const user = userEvent.setup();
    renderCard();

    await user.click(screen.getByRole('button', { name: "Add the author's words" }));
    await user.type(screen.getByLabelText('Position'), '42');
    await user.type(screen.getByLabelText('Note'), 'A point.');
    await user.click(file());

    await waitFor(() =>
      expect(screen.queryByLabelText("The author's words")).not.toBeInTheDocument(),
    );
  });

  it('flags a note as an open question while it is being written', async () => {
    const user = userEvent.setup();
    const { onFile } = renderCard();

    await user.click(screen.getByRole('button', { name: 'Open question' }));
    await user.type(screen.getByLabelText('Position'), '42');
    await user.type(screen.getByLabelText('Note'), 'Not sure I follow this.');
    await user.click(file());

    await waitFor(() =>
      expect(onFile).toHaveBeenCalledWith(expect.objectContaining({ openQuestion: true })),
    );
  });

  it('files the position exactly as typed rather than formatting it', async () => {
    const user = userEvent.setup();
    const { onFile } = renderCard();

    await user.type(screen.getByLabelText('Position'), '12:30');
    await user.type(screen.getByLabelText('Note'), 'A point in a talk.');
    await user.click(file());

    await waitFor(() =>
      expect(onFile).toHaveBeenCalledWith(expect.objectContaining({ position: '12:30' })),
    );
  });
});
