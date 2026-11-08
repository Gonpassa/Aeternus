import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
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

describe('NoteStream', () => {
  it('says plainly that nothing has been written from the Source yet', () => {
    render(<NoteStream notes={[]} />);

    expect(screen.getByText('Nothing written from this yet.')).toBeInTheDocument();
  });

  it('renders the notes in the order it was given them', () => {
    render(
      <NoteStream
        notes={[note({ id: 1, body: 'Written first.' }), note({ id: 2, body: 'Written second.' })]}
      />,
    );

    expect(screen.getAllByText(/^Written /).map((element) => element.textContent)).toEqual([
      'Written first.',
      'Written second.',
    ]);
  });

  it('renders the Locator as one string on the card', () => {
    render(<NoteStream notes={[note({ section: 'Ch. 3', position: '42' })]} />);

    expect(screen.getByText('Ch. 3')).toBeInTheDocument();
    expect(screen.getByText('p. 42')).toBeInTheDocument();
  });

  it('keeps the line breaks the note was written with', () => {
    render(<NoteStream notes={[note({ body: 'One thought.\n\nAnother.' })]} />);

    expect(screen.getByText(/One thought\./)).toHaveStyle({ whiteSpace: 'pre-wrap' });
  });

  it('shows the open-question flag on a filed card', () => {
    render(<NoteStream notes={[note({ openQuestion: true })]} />);

    expect(screen.getByText('Open question')).toBeInTheDocument();
  });

  it('says nothing about an open question on a note that is not flagged', () => {
    render(<NoteStream notes={[note()]} />);

    expect(screen.queryByText('Open question')).not.toBeInTheDocument();
  });

  // The author's words stay a slip under the card rather than prose mixed into the user's own.
  it('reveals the excerpt on demand', async () => {
    const user = userEvent.setup();
    render(<NoteStream notes={[note({ excerpt: 'Their exact words.' })]} />);

    expect(screen.queryByText('Their exact words.')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: "The author's words" }));

    expect(screen.getByText('Their exact words.')).toBeInTheDocument();
  });

  it('offers nothing to reveal on a note with no excerpt', () => {
    render(<NoteStream notes={[note()]} />);

    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });
});
