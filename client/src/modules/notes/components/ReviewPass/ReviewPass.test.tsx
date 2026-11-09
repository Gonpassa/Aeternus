import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ComponentProps, ReactNode } from 'react';
import type { LiteratureNote, ReviewBand, ReviewQueueNote } from '@nee3/shared-types';
import { queryWrapper } from '../../../../test/queryWrapper.tsx';
import { ReviewPass } from './ReviewPass.tsx';

vi.mock('@tanstack/react-router', () => ({
  Link: ({ to, children }: { to: string; children: ReactNode }) => <a href={to}>{children}</a>,
}));

const literatureNote = (overrides: Partial<LiteratureNote> = {}): LiteratureNote => ({
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

const queued = ({
  band = 'never-answered' as ReviewBand,
  sourceTitle = 'How to Take Smart Notes',
  ...note
}: Partial<LiteratureNote> & {
  band?: ReviewBand;
  sourceTitle?: string;
} = {}): ReviewQueueNote => ({
  note: literatureNote(note),
  sourceTitle,
  inheritedTopics: [],
  band,
});

const renderPass = (props: Partial<ComponentProps<typeof ReviewPass>> = {}) => {
  const notes = props.notes ?? [queued()];
  return render(
    <ReviewPass
      notes={notes}
      dueCount={props.dueCount ?? notes.filter((row) => row.band === 'never-answered').length}
      onNothingHere={props.onNothingHere ?? vi.fn()}
      onLink={props.onLink ?? vi.fn()}
      onWritePermanentNote={props.onWritePermanentNote ?? vi.fn()}
      onClearOpenQuestion={props.onClearOpenQuestion ?? vi.fn()}
      onStartAgain={props.onStartAgain ?? vi.fn()}
    />,
    { wrapper: queryWrapper() },
  );
};

describe('ReviewPass', () => {
  it('hands back one note at a time, as a card labelled by its Source', () => {
    renderPass({
      notes: [
        queued({ id: 1, body: 'The first one.', sourceTitle: 'Smart Notes' }),
        queued({ id: 2, body: 'The second one.' }),
      ],
    });

    expect(screen.getByText('The first one.')).toBeInTheDocument();
    expect(screen.queryByText('The second one.')).not.toBeInTheDocument();
    expect(screen.getByText('Smart Notes')).toBeInTheDocument();
    // The Source labels the tab and the whole Locator sits in the corner, where the reading
    // page's card splits the two halves across both.
    expect(screen.getByText('Ch. 3 · p. 42')).toBeInTheDocument();
  });

  it('offers exactly the three Answers', () => {
    renderPass();

    expect(screen.getByRole('button', { name: 'Nothing of mine here' })).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Connect this to another note' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Write a Permanent note from it' }),
    ).toBeInTheDocument();
  });

  it('records "nothing of mine here" and moves on to the next note', async () => {
    const onNothingHere = vi.fn().mockResolvedValue(undefined);
    renderPass({
      notes: [
        queued({ id: 1, body: 'The first one.' }),
        queued({ id: 2, body: 'The second one.' }),
      ],
      onNothingHere,
    });

    await userEvent.click(screen.getByRole('button', { name: 'Nothing of mine here' }));

    expect(onNothingHere).toHaveBeenCalledWith(expect.objectContaining({ id: 1 }));
    expect(await screen.findByText('The second one.')).toBeInTheDocument();
  });

  it('keeps the note in front of the user when the Answer could not be recorded', async () => {
    renderPass({
      notes: [
        queued({ id: 1, body: 'The first one.' }),
        queued({ id: 2, body: 'The second one.' }),
      ],
      onNothingHere: vi.fn().mockRejectedValue(new Error('offline')),
    });

    await userEvent.click(screen.getByRole('button', { name: 'Nothing of mine here' }));

    expect(await screen.findByText('The first one.')).toBeInTheDocument();
  });

  it('opens the existing link panel rather than anything of its own', async () => {
    renderPass();

    await userEvent.click(screen.getByRole('button', { name: 'Connect this to another note' }));

    expect(screen.getByRole('group', { name: 'Connect this note' })).toBeInTheDocument();
  });

  it('records no Answer when the link panel is closed again', async () => {
    const onLink = vi.fn();
    renderPass({ onLink });

    await userEvent.click(screen.getByRole('button', { name: 'Connect this to another note' }));
    await userEvent.click(screen.getByRole('button', { name: 'Done' }));

    expect(onLink).not.toHaveBeenCalled();
    expect(screen.getByText('Reading is not understanding.')).toBeInTheDocument();
  });

  it('opens the existing Permanent note composer, with this note as its connection', async () => {
    renderPass();

    await userEvent.click(screen.getByRole('button', { name: 'Write a Permanent note from it' }));

    expect(screen.getByRole('form', { name: 'Write a Permanent note' })).toBeInTheDocument();
    expect(screen.getByText('How to Take Smart Notes · Ch. 3 · p. 42')).toBeInTheDocument();
  });

  it('records no Answer when the composer is abandoned, and leaves the note where it was', async () => {
    const onWritePermanentNote = vi.fn();
    renderPass({
      notes: [
        queued({ id: 1, body: 'The first one.' }),
        queued({ id: 2, body: 'The second one.' }),
      ],
      onWritePermanentNote,
    });

    await userEvent.click(screen.getByRole('button', { name: 'Write a Permanent note from it' }));
    await userEvent.click(screen.getByRole('button', { name: 'Discard' }));

    expect(onWritePermanentNote).not.toHaveBeenCalled();
    expect(screen.getByText('The first one.')).toBeInTheDocument();
    expect(screen.queryByText('The second one.')).not.toBeInTheDocument();
  });

  it('shows only one of the panel and the composer at a time', async () => {
    renderPass();

    await userEvent.click(screen.getByRole('button', { name: 'Connect this to another note' }));
    await userEvent.click(screen.getByRole('button', { name: 'Write a Permanent note from it' }));

    expect(screen.getByRole('form', { name: 'Write a Permanent note' })).toBeInTheDocument();
    expect(screen.queryByRole('group', { name: 'Connect this note' })).not.toBeInTheDocument();
  });

  it('closes the pass on a summary card at the end of the notes never answered', async () => {
    renderPass({
      notes: [queued({ id: 1, body: 'The due one.' }), queued({ id: 2, band: 'answered' })],
      dueCount: 1,
      onNothingHere: vi.fn().mockResolvedValue(undefined),
    });

    await userEvent.click(screen.getByRole('button', { name: 'Nothing of mine here' }));

    expect(await screen.findByText('That is every note you had not answered.')).toBeInTheDocument();
    expect(screen.getByText('1 note with nothing of yours in them yet.')).toBeInTheDocument();
  });

  it('offers the notes already answered from the summary, behind the pass', async () => {
    renderPass({
      notes: [
        queued({ id: 1, body: 'The due one.' }),
        queued({ id: 2, body: 'The answered one.', band: 'answered' }),
      ],
      dueCount: 1,
      onNothingHere: vi.fn().mockResolvedValue(undefined),
    });

    await userEvent.click(screen.getByRole('button', { name: 'Nothing of mine here' }));
    await userEvent.click(
      await screen.findByRole('button', { name: 'Look again at notes you have answered' }),
    );

    expect(screen.getByText('The answered one.')).toBeInTheDocument();
  });

  it('does not offer to carry on when there is nothing behind the pass', async () => {
    renderPass({
      notes: [queued({ id: 1 })],
      dueCount: 1,
      onNothingHere: vi.fn().mockResolvedValue(undefined),
    });

    await userEvent.click(screen.getByRole('button', { name: 'Nothing of mine here' }));

    expect(
      screen.queryByRole('button', { name: 'Look again at notes you have answered' }),
    ).not.toBeInTheDocument();
  });

  it('says plainly that nothing is waiting when no note is due', () => {
    renderPass({ notes: [queued({ id: 1, band: 'answered' })], dueCount: 0 });

    expect(screen.getByText('Nothing is waiting for you.')).toBeInTheDocument();
  });

  it('invites the user to read something when nothing has been written yet', () => {
    renderPass({ notes: [], dueCount: 0 });

    expect(screen.getByRole('link', { name: 'Go and read something' })).toHaveAttribute(
      'href',
      '/notes/read',
    );
  });

  it('shows no interval, no due date, no pass count and no streak', async () => {
    renderPass({
      notes: [queued({ id: 1 }), queued({ id: 2 })],
      dueCount: 2,
      onNothingHere: vi.fn().mockResolvedValue(undefined),
    });

    await userEvent.click(screen.getByRole('button', { name: 'Nothing of mine here' }));
    await userEvent.click(screen.getByRole('button', { name: 'Nothing of mine here' }));
    await screen.findByText('That is every note you had not answered.');

    expect(
      screen.queryByText(/due in|next|overdue|streak|interval|pass \d|day|week/i),
    ).not.toBeInTheDocument();
  });

  describe('the open-question flag', () => {
    it('clears it without answering the note or moving on', async () => {
      const onClearOpenQuestion = vi.fn().mockResolvedValue(undefined);
      const onNothingHere = vi.fn();
      renderPass({
        notes: [queued({ id: 1, openQuestion: true })],
        onClearOpenQuestion,
        onNothingHere,
      });

      expect(screen.getByText('Open question')).toBeInTheDocument();
      await userEvent.click(screen.getByRole('button', { name: 'This is settled now' }));

      expect(onClearOpenQuestion).toHaveBeenCalledWith(expect.objectContaining({ id: 1 }));
      expect(onNothingHere).not.toHaveBeenCalled();
      expect(screen.queryByText('Open question')).not.toBeInTheDocument();
      expect(screen.getByText('Reading is not understanding.')).toBeInTheDocument();
    });

    it('is not offered on a note that was not flagged', () => {
      renderPass({ notes: [queued({ id: 1, openQuestion: false })] });

      expect(screen.queryByRole('button', { name: 'This is settled now' })).not.toBeInTheDocument();
    });
  });
});
