import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ComponentProps } from 'react';
import type { LiteratureNote, Source } from '@nee3/shared-types';
import { SourceReading } from './SourceReading.tsx';

const source = (overrides: Partial<Source> = {}): Source => ({
  id: 7,
  userId: 1,
  title: 'How to Take Smart Notes',
  kind: 'book',
  author: 'Sonke Ahrens',
  url: null,
  createdAt: '2026-09-01T10:00:00.000Z',
  updatedAt: '2026-09-01T10:00:00.000Z',
  ...overrides,
});

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

const renderPage = (props: Partial<ComponentProps<typeof SourceReading>> = {}) =>
  render(
    <SourceReading
      source={props.source ?? source()}
      notes={props.notes ?? []}
      sections={props.sections ?? []}
      onFile={props.onFile ?? vi.fn()}
      onCorrectSource={props.onCorrectSource ?? vi.fn()}
      onDeleteSource={props.onDeleteSource ?? vi.fn()}
      onCorrectNote={props.onCorrectNote ?? vi.fn()}
      onDeleteNote={props.onDeleteNote ?? vi.fn()}
    />,
  );

describe('SourceReading', () => {
  it('names the Source and what kind of thing it is', () => {
    renderPage();

    expect(screen.getByRole('heading', { name: 'How to Take Smart Notes' })).toBeInTheDocument();
    expect(screen.getByText('Book')).toBeInTheDocument();
    expect(screen.getByText('Sonke Ahrens')).toBeInTheDocument();
  });

  it('omits the author line when there is no author', () => {
    renderPage({ source: source({ author: null }) });

    expect(screen.queryByText(/no author/i)).not.toBeInTheDocument();
  });

  it('says plainly that nothing has been written from it yet', () => {
    renderPage();

    // Said once, by the empty stream - not again as a count of nothing in the header.
    expect(screen.getByText('Nothing written from this yet.')).toBeInTheDocument();
    expect(screen.queryByText('0 notes')).not.toBeInTheDocument();
  });

  it("shows this Source's notes, and counts them", () => {
    renderPage({
      notes: [
        note({ id: 1, body: 'The first point.' }),
        note({ id: 2, body: 'The second point.' }),
      ],
    });

    expect(screen.getByText('The first point.')).toBeInTheDocument();
    expect(screen.getByText('The second point.')).toBeInTheDocument();
    expect(screen.getByText('2 notes')).toBeInTheDocument();
  });

  it('offers a blank card to write the next note on', () => {
    renderPage();

    expect(screen.getByLabelText('Note')).toBeInTheDocument();
    expect(screen.getByLabelText('Section')).toBeInTheDocument();
    expect(screen.getByLabelText('Position')).toBeInTheDocument();
  });

  it("hands the capture card this Source's earlier sections", () => {
    renderPage({ sections: ['Ch. 2', 'Ch. 1'] });

    expect(screen.getByLabelText('Section')).toHaveValue('Ch. 2');
    expect(screen.getByRole('button', { name: 'Ch. 1' })).toBeInTheDocument();
  });

  it('links out to the Source without handing the destination a referrer', () => {
    renderPage({ source: source({ url: 'https://example.com/smart-notes' }) });

    const link = screen.getByRole('link', { name: 'https://example.com/smart-notes' });
    expect(link).toHaveAttribute('href', 'https://example.com/smart-notes');
    expect(link).toHaveAttribute('target', '_blank');
    expect(link).toHaveAttribute('rel', 'noreferrer');
  });

  it('shows no link when the Source has none', () => {
    renderPage();

    expect(screen.queryByRole('link')).not.toBeInTheDocument();
  });

  it('keeps the notes in the order it was given them, oldest first', () => {
    renderPage({
      notes: [note({ id: 1, body: 'Written first.' }), note({ id: 2, body: 'Written second.' })],
    });

    const bodies = screen.getAllByText(/^Written /).map((element) => element.textContent);
    expect(bodies).toEqual(['Written first.', 'Written second.']);
  });

  it('shows no reading status', () => {
    renderPage();

    expect(screen.queryByText(/reading|finished|to read|in progress/i)).not.toBeInTheDocument();
  });

  // In place, where the header stands: a mistyped title is noticed while reading, and being
  // sent to a page of its own to fix it loses the reader's place (#83).
  it('corrects the Source from the header it is read in, kind included', async () => {
    const user = userEvent.setup();
    const onCorrectSource = vi.fn().mockResolvedValue(undefined);
    renderPage({ onCorrectSource });

    await user.click(screen.getByRole('button', { name: 'Correct these details' }));

    expect(screen.getByLabelText('Title')).toHaveValue('How to Take Smart Notes');
    expect(screen.getByLabelText('Author')).toHaveValue('Sonke Ahrens');

    await user.clear(screen.getByLabelText('Title'));
    await user.type(screen.getByLabelText('Title'), 'Smart Notes, 2nd edition');
    await user.click(screen.getByRole('button', { name: 'Save' }));

    expect(onCorrectSource).toHaveBeenCalledWith({
      title: 'Smart Notes, 2nd edition',
      kind: 'book',
      author: 'Sonke Ahrens',
      url: null,
    });
  });

  it('shows the corrected Source once the page is given it, without a reload', async () => {
    const user = userEvent.setup();
    const { rerender } = render(
      <SourceReading
        source={source()}
        notes={[]}
        sections={[]}
        onFile={vi.fn()}
        onCorrectSource={vi.fn().mockResolvedValue(undefined)}
        onDeleteSource={vi.fn()}
        onCorrectNote={vi.fn()}
        onDeleteNote={vi.fn()}
      />,
    );

    await user.click(screen.getByRole('button', { name: 'Correct these details' }));
    await user.clear(screen.getByLabelText('Title'));
    await user.type(screen.getByLabelText('Title'), 'A corrected title');
    await user.click(screen.getByRole('button', { name: 'Save' }));

    rerender(
      <SourceReading
        source={source({ title: 'A corrected title', kind: 'article' })}
        notes={[]}
        sections={[]}
        onFile={vi.fn()}
        onCorrectSource={vi.fn()}
        onDeleteSource={vi.fn()}
        onCorrectNote={vi.fn()}
        onDeleteNote={vi.fn()}
      />,
    );

    expect(screen.getByRole('heading', { name: 'A corrected title' })).toBeInTheDocument();
    expect(screen.getByText('Article')).toBeInTheDocument();
  });

  it('leaves the header as it was when the correction is abandoned', async () => {
    const user = userEvent.setup();
    const onCorrectSource = vi.fn();
    renderPage({ onCorrectSource });

    await user.click(screen.getByRole('button', { name: 'Correct these details' }));
    await user.click(screen.getByRole('button', { name: 'Cancel' }));

    expect(onCorrectSource).not.toHaveBeenCalled();
    expect(screen.getByRole('heading', { name: 'How to Take Smart Notes' })).toBeInTheDocument();
  });

  // Deleting a Source takes every note written from it (#70), which is more than the header
  // shows at a glance - so the confirmation counts them.
  it('deletes the Source only once the cascade is confirmed', async () => {
    const user = userEvent.setup();
    const onDeleteSource = vi.fn().mockResolvedValue(undefined);
    renderPage({ notes: [note({ id: 1 }), note({ id: 2 })], onDeleteSource });

    await user.click(screen.getByRole('button', { name: 'Delete this Source' }));

    expect(onDeleteSource).not.toHaveBeenCalled();
    expect(screen.getByText(/2 notes written from it go with it/)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Delete Source' }));

    expect(onDeleteSource).toHaveBeenCalled();
  });

  it('passes a correction and a deletion through for the card they belong to', async () => {
    const user = userEvent.setup();
    const onCorrectNote = vi.fn().mockResolvedValue(undefined);
    const onDeleteNote = vi.fn().mockResolvedValue(undefined);
    renderPage({ notes: [note({ id: 11 })], onCorrectNote, onDeleteNote });

    await user.click(screen.getByRole('button', { name: 'Correct this note' }));
    await user.click(screen.getByRole('button', { name: 'Save' }));
    expect(onCorrectNote).toHaveBeenCalledWith(11, expect.objectContaining({ section: 'Ch. 3' }));

    await user.click(screen.getByRole('button', { name: 'Correct this note' }));
    await user.click(screen.getByRole('button', { name: 'Delete this note' }));
    await user.click(screen.getByRole('button', { name: 'Delete note' }));
    expect(onDeleteNote).toHaveBeenCalledWith(11);
  });
});
