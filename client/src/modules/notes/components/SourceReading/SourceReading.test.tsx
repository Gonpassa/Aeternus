import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import type { Source } from '@nee3/shared-types';
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

describe('SourceReading', () => {
  it('names the Source and what kind of thing it is', () => {
    render(<SourceReading source={source()} />);

    expect(screen.getByRole('heading', { name: 'How to Take Smart Notes' })).toBeInTheDocument();
    expect(screen.getByText('Book')).toBeInTheDocument();
    expect(screen.getByText('Sonke Ahrens')).toBeInTheDocument();
  });

  it('omits the author line when there is no author', () => {
    render(<SourceReading source={source({ author: null })} />);

    expect(screen.queryByText(/no author/i)).not.toBeInTheDocument();
  });

  // The page is empty by design in this slice: capture, the note stream and Topics each
  // arrive with their own ticket.
  it('says plainly that nothing has been written from it yet', () => {
    render(<SourceReading source={source()} />);

    expect(screen.getByText('Nothing written from this yet.')).toBeInTheDocument();
  });

  it('links out to the Source without handing the destination a referrer', () => {
    render(<SourceReading source={source({ url: 'https://example.com/smart-notes' })} />);

    const link = screen.getByRole('link', { name: 'https://example.com/smart-notes' });
    expect(link).toHaveAttribute('href', 'https://example.com/smart-notes');
    expect(link).toHaveAttribute('target', '_blank');
    expect(link).toHaveAttribute('rel', 'noreferrer');
  });

  it('shows no link when the Source has none', () => {
    render(<SourceReading source={source()} />);

    expect(screen.queryByRole('link')).not.toBeInTheDocument();
  });

  it('shows no reading status', () => {
    render(<SourceReading source={source()} />);

    expect(screen.queryByText(/reading|finished|to read|in progress/i)).not.toBeInTheDocument();
  });
});
