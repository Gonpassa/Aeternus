import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
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

    expect(screen.getByRole('button', { name: 'Ch. 2' })).toBeInTheDocument();
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
});
