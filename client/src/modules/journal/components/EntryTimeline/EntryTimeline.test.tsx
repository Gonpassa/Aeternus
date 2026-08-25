import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import type { Entry } from '@nee3/shared-types';

vi.mock('@tanstack/react-router', () => ({
  Link: ({
    to,
    params,
    children,
  }: {
    to: string;
    params?: { entryId: string };
    children: ReactNode;
  }) => <a href={params ? to.replace('$entryId', params.entryId) : to}>{children}</a>,
}));

const { EntryTimeline } = await import('./EntryTimeline.tsx');

const buildEntry = (overrides: Partial<Entry> = {}): Entry => ({
  id: 1,
  userId: 1,
  date: '2026-08-01',
  title: 'A good day',
  primaryMood: 'happy',
  specificEmotion: null,
  content: '<p>It was a good day, all things considered.</p>',
  createdAt: '2026-08-01T00:00:00.000Z',
  updatedAt: '2026-08-01T00:00:00.000Z',
  ...overrides,
});

describe('EntryTimeline', () => {
  it('groups entries under a month heading', () => {
    render(
      <EntryTimeline
        entries={[
          buildEntry({ id: 1, date: '2026-08-01', title: 'August entry' }),
          buildEntry({ id: 2, date: '2026-07-15', title: 'July entry' }),
        ]}
      />,
    );

    expect(screen.getByText('August 2026')).toBeInTheDocument();
    expect(screen.getByText('July 2026')).toBeInTheDocument();
  });

  it('keeps entries from the same month under one heading', () => {
    render(
      <EntryTimeline
        entries={[
          buildEntry({ id: 1, date: '2026-08-01', title: 'First' }),
          buildEntry({ id: 2, date: '2026-08-15', title: 'Second' }),
        ]}
      />,
    );

    expect(screen.getAllByText('August 2026')).toHaveLength(1);
    expect(screen.getByText('First')).toBeInTheDocument();
    expect(screen.getByText('Second')).toBeInTheDocument();
  });

  it('renders the day number, mood label, title, and a stripped excerpt for each entry', () => {
    render(
      <EntryTimeline
        entries={[
          buildEntry({
            id: 1,
            date: '2026-08-07',
            title: 'A good day',
            primaryMood: 'calm',
            content: '<p>It was a <strong>calm</strong> day.</p>',
          }),
        ]}
      />,
    );

    expect(screen.getByText('07')).toBeInTheDocument();
    expect(screen.getByText('Calm')).toBeInTheDocument();
    expect(screen.getByText('A good day')).toBeInTheDocument();
    expect(screen.getByText('It was a calm day.')).toBeInTheDocument();
  });

  it('links each entry row to its detail route', () => {
    render(<EntryTimeline entries={[buildEntry({ id: 42, title: 'Linked entry' })]} />);

    expect(screen.getByRole('link', { name: /Linked entry/ })).toHaveAttribute(
      'href',
      '/journal/42',
    );
  });
});
