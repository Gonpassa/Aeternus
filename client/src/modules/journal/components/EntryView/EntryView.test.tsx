import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import type { Entry } from '@nee3/shared-types';
import { EntryView } from './EntryView.tsx';

const baseEntry: Entry = {
  id: 1,
  userId: 1,
  date: '2026-08-01',
  title: 'A day',
  primaryMood: 'happy',
  specificEmotion: 'content',
  content: '<p>Body</p>',
  createdAt: '2026-08-01T00:00:00.000Z',
  updatedAt: '2026-08-01T00:00:00.000Z',
};

describe('EntryView', () => {
  it('shows the primary mood and specific emotion separated by a dot when both are present', () => {
    render(<EntryView entry={baseEntry} />);
    expect(screen.getByText(/Happy/)).toBeInTheDocument();
    expect(screen.getByText(/content/)).toBeInTheDocument();
    expect(screen.getByText(/Happy.*content/)).toBeInTheDocument();
  });

  it('shows only the primary mood, with no dangling separator, when specificEmotion is null', () => {
    render(<EntryView entry={{ ...baseEntry, specificEmotion: null }} />);
    expect(screen.getByText('Happy')).toBeInTheDocument();
    expect(screen.queryByText(/·/)).not.toBeInTheDocument();
  });
});
