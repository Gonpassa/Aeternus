import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { LiteratureNoteWithConnections } from '@nee3/shared-types';
import { queryWrapper } from '../../../../test/queryWrapper.tsx';
import { NoteStream } from './NoteStream.tsx';

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

const renderStream = (notes: LiteratureNoteWithConnections[]) =>
  render(
    <NoteStream
      notes={notes}
      sourceTitle="How to Take Smart Notes"
      onWritePermanentNote={vi.fn()}
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

    expect(screen.queryByRole('button', { name: "The author's words" })).not.toBeInTheDocument();
  });

  // The reading page is where a Permanent note is written: the user's own thinking happens
  // while reading, not only later (#67).
  it('offers to write a Permanent note from each filed card', () => {
    renderStream([note()]);

    expect(screen.getByRole('button', { name: 'Write a Permanent note' })).toBeInTheDocument();
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

    expect(screen.getByText('Connected from')).toBeInTheDocument();
    expect(screen.getByText('Writing is how an idea is tested.')).toBeInTheDocument();
    expect(screen.getByText('This is the claim that note was circling.')).toBeInTheDocument();
    expect(screen.queryByText('Connects to')).not.toBeInTheDocument();
  });
});
