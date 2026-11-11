import { describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { queryWrapper } from '../../../../test/queryWrapper.tsx';
import { PermanentNoteComposer } from './PermanentNoteComposer.tsx';
import { PERMANENT_NOTE_TITLE_MAX } from './PermanentNoteComposer.utils.ts';
import { LINK_REASON_MAX } from '../../utils/linkReason.ts';

const renderComposer = (
  overrides: { onWrite?: () => Promise<void>; initialTopicNames?: string[] } = {},
) => {
  const onWrite = overrides.onWrite ?? vi.fn().mockResolvedValue(undefined);
  const onDiscard = vi.fn();
  render(
    <PermanentNoteComposer
      targetNoteId={7}
      targetLabel="How to Take Smart Notes · Ch. 3 · p. 42"
      initialTopicNames={overrides.initialTopicNames}
      onWrite={onWrite}
      onDiscard={onDiscard}
    />,
    { wrapper: queryWrapper() },
  );
  return { onWrite, onDiscard };
};

const file = () => screen.getByRole('button', { name: 'File the idea' });

describe('PermanentNoteComposer', () => {
  it('asks for the claim, the idea and the reason for the connection', () => {
    renderComposer();

    expect(screen.getByLabelText('The claim')).toBeInTheDocument();
    expect(screen.getByLabelText('The idea')).toBeInTheDocument();
    expect(screen.getByLabelText('Why these belong together')).toBeInTheDocument();
  });

  // ADR 0017: plain text throughout this module, and nothing a toolbar would hang off.
  it('writes the claim and the idea in plain fields, with no editor toolbar', () => {
    renderComposer();

    expect(screen.getByLabelText('The claim').tagName).toBe('TEXTAREA');
    expect(screen.getByLabelText('The idea').tagName).toBe('TEXTAREA');
    expect(screen.queryByRole('toolbar')).not.toBeInTheDocument();
  });

  // ADR 0014: the target is the note the composer was opened from, pre-selected, and the
  // reason is a field of the composer rather than a step after the save.
  it('names the pre-selected target on the card and offers no target to pick', () => {
    renderComposer();

    expect(screen.getByText('Links to')).toBeInTheDocument();
    expect(screen.getByText('How to Take Smart Notes · Ch. 3 · p. 42')).toBeInTheDocument();
    expect(screen.queryByRole('combobox')).not.toBeInTheDocument();
  });

  it('offers no way to save without the connection', () => {
    renderComposer();

    expect(screen.queryByRole('button', { name: /link later/i })).not.toBeInTheDocument();
    expect(screen.getAllByRole('button').map((element) => element.textContent)).toEqual([
      'Add a Topic',
      'Discard',
      'File the idea',
    ]);
  });

  it('writes the note and its first Link as one request', async () => {
    const user = userEvent.setup();
    const { onWrite } = renderComposer();

    await user.type(screen.getByLabelText('The claim'), 'Writing is how an idea is tested.');
    await user.type(screen.getByLabelText('The idea'), 'An unwritten idea has not been had.');
    await user.type(
      screen.getByLabelText('Why these belong together'),
      'This is the claim that note was circling.',
    );
    await user.click(file());

    await waitFor(() =>
      expect(onWrite).toHaveBeenCalledWith({
        title: 'Writing is how an idea is tested.',
        body: 'An unwritten idea has not been had.',
        links: [{ targetNoteId: 7, reason: 'This is the claim that note was circling.' }],
        topicNames: [],
      }),
    );
  });

  // Optional here as everywhere: a Permanent note is the one note kind that carries Topics of
  // its own, and it carries none unless the writer puts one on (CONTEXT.md, Topic).
  it('sends the Topics put on the note with it', async () => {
    const user = userEvent.setup();
    const { onWrite } = renderComposer();

    await user.type(screen.getByLabelText('The claim'), 'Writing is how an idea is tested.');
    await user.type(screen.getByLabelText('The idea'), 'An unwritten idea has not been had.');
    await user.type(screen.getByLabelText('Why these belong together'), 'The claim it circled.');
    await user.click(screen.getByRole('button', { name: 'Add a Topic' }));
    await user.type(screen.getByLabelText('Topic name'), 'Attention');
    await user.click(screen.getByRole('button', { name: 'Add' }));
    await user.click(file());

    await waitFor(() =>
      expect(onWrite).toHaveBeenCalledWith(expect.objectContaining({ topicNames: ['Attention'] })),
    );
  });

  // The bug behind "Topics does not count Permanent notes": a name typed but never added was
  // dropped without a word, so the note was filed under no Topic at all (#104).
  it('files a Topic that was typed but never added', async () => {
    const user = userEvent.setup();
    const { onWrite } = renderComposer();

    await user.type(screen.getByLabelText('The claim'), 'Writing is how an idea is tested.');
    await user.type(screen.getByLabelText('The idea'), 'An unwritten idea has not been had.');
    await user.type(screen.getByLabelText('Why these belong together'), 'The claim it circled.');
    await user.click(screen.getByRole('button', { name: 'Add a Topic' }));
    await user.type(screen.getByLabelText('Topic name'), 'Attention');
    await user.click(file());

    await waitFor(() =>
      expect(onWrite).toHaveBeenCalledWith(expect.objectContaining({ topicNames: ['Attention'] })),
    );
  });

  it('adds a Topic on Enter without filing the note', async () => {
    const user = userEvent.setup();
    const { onWrite } = renderComposer();

    await user.type(screen.getByLabelText('The claim'), 'Writing is how an idea is tested.');
    await user.type(screen.getByLabelText('The idea'), 'An unwritten idea has not been had.');
    await user.type(screen.getByLabelText('Why these belong together'), 'The claim it circled.');
    await user.click(screen.getByRole('button', { name: 'Add a Topic' }));
    await user.type(screen.getByLabelText('Topic name'), 'Attention{Enter}');

    expect(
      within(screen.getByRole('list', { name: 'Topics' })).getByText('Attention'),
    ).toBeInTheDocument();
    expect(onWrite).not.toHaveBeenCalled();
  });

  // A note written from a reading starts out about what the reading is about (CONTEXT.md,
  // Topic). The Topics are the note's own from then on, so each can be taken off before filing.
  it('starts with the Topics of the note it was opened from', async () => {
    const user = userEvent.setup();
    const { onWrite } = renderComposer({ initialTopicNames: ['Christianity', 'History'] });

    await user.type(screen.getByLabelText('The claim'), 'Writing is how an idea is tested.');
    await user.type(screen.getByLabelText('The idea'), 'An unwritten idea has not been had.');
    await user.type(screen.getByLabelText('Why these belong together'), 'The claim it circled.');
    await user.click(screen.getByRole('button', { name: 'Remove the Topic History' }));
    await user.click(screen.getByRole('button', { name: 'Add another Topic' }));
    await user.type(screen.getByLabelText('Topic name'), 'Grace');
    await user.click(screen.getByRole('button', { name: 'Add' }));
    await user.click(file());

    await waitFor(() =>
      expect(onWrite).toHaveBeenCalledWith(
        expect.objectContaining({ topicNames: ['Christianity', 'Grace'] }),
      ),
    );
  });

  it('refuses to save a picked target with no reason', async () => {
    const user = userEvent.setup();
    const { onWrite } = renderComposer();

    await user.type(screen.getByLabelText('The claim'), 'A claim with no stated connection.');
    await user.type(screen.getByLabelText('The idea'), 'The idea itself.');
    await user.click(file());

    expect(
      await screen.findByText('Every Link needs a line saying why the two belong together.'),
    ).toBeInTheDocument();
    expect(onWrite).not.toHaveBeenCalled();
  });

  it('refuses to save without a title or without the idea written out', async () => {
    const user = userEvent.setup();
    const { onWrite } = renderComposer();

    await user.click(file());

    expect(
      await screen.findByText('A Permanent note needs a title stating the idea as a claim.'),
    ).toBeInTheDocument();

    await user.type(screen.getByLabelText('The claim'), 'A titled claim.');

    expect(
      await screen.findByText('A Permanent note needs the idea written out.'),
    ).toBeInTheDocument();
    expect(onWrite).not.toHaveBeenCalled();
  });

  it('names the ceiling when a field runs over it', async () => {
    const user = userEvent.setup();
    renderComposer();

    await user.type(screen.getByLabelText('The claim'), 'a'.repeat(PERMANENT_NOTE_TITLE_MAX + 1));
    await user.tab();

    expect(
      await screen.findByText(`A title is at most ${PERMANENT_NOTE_TITLE_MAX} characters.`),
    ).toBeInTheDocument();
  });

  // ADR 0015: the ceiling on a reason is the mechanism that says "this is a note of its own".
  it('tells a reason that will not stay one line to become a note instead', async () => {
    const user = userEvent.setup();
    renderComposer();

    // The claim and the idea are filled in first: the card carries one error line, and the
    // one being tested here is the last of the three it can be about.
    await user.type(screen.getByLabelText('The claim'), 'A claim.');
    await user.type(screen.getByLabelText('The idea'), 'The idea.');
    await user.type(
      screen.getByLabelText('Why these belong together'),
      'a'.repeat(LINK_REASON_MAX + 1),
    );
    await user.tab();

    expect(
      await screen.findByText(
        `A reason is at most ${LINK_REASON_MAX} characters - longer than that is a note of its own.`,
      ),
    ).toBeInTheDocument();
  });

  it('keeps what was written when the request fails', async () => {
    const user = userEvent.setup();
    const { onWrite } = renderComposer({
      onWrite: vi.fn().mockRejectedValue(new Error('refused')),
    });

    await user.type(screen.getByLabelText('The claim'), 'A claim.');
    await user.type(screen.getByLabelText('The idea'), 'The idea.');
    await user.type(screen.getByLabelText('Why these belong together'), 'Because.');
    await user.click(file());

    await waitFor(() => expect(onWrite).toHaveBeenCalled());
    expect(screen.getByLabelText('The claim')).toHaveValue('A claim.');
  });

  it('discards the card on request without writing anything', async () => {
    const user = userEvent.setup();
    const { onWrite, onDiscard } = renderComposer();

    await user.click(screen.getByRole('button', { name: 'Discard' }));

    expect(onDiscard).toHaveBeenCalled();
    expect(onWrite).not.toHaveBeenCalled();
  });
});
