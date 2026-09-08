import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import type { Dream } from '@nee3/shared-types';
import { DreamTimeline } from './DreamTimeline.tsx';

const buildDream = (overrides: Partial<Dream> = {}): Dream => ({
  id: 1,
  userId: 1,
  date: '2026-08-01',
  narrative: '<p>It was a strange, vivid dream.</p>',
  createdAt: '2026-08-01T00:00:00.000Z',
  updatedAt: '2026-08-01T00:00:00.000Z',
  ...overrides,
});

describe('DreamTimeline', () => {
  it('groups dreams under a month heading', () => {
    render(
      <DreamTimeline
        dreams={[
          buildDream({ id: 1, date: '2026-08-01' }),
          buildDream({ id: 2, date: '2026-07-15' }),
        ]}
      />,
    );

    expect(screen.getByText('August 2026')).toBeInTheDocument();
    expect(screen.getByText('July 2026')).toBeInTheDocument();
  });

  it('keeps dreams from the same month under one heading', () => {
    render(
      <DreamTimeline
        dreams={[
          buildDream({ id: 1, date: '2026-08-01' }),
          buildDream({ id: 2, date: '2026-08-15' }),
        ]}
      />,
    );

    expect(screen.getAllByText('August 2026')).toHaveLength(1);
  });

  it('renders more than one dream recorded on the same date', () => {
    render(
      <DreamTimeline
        dreams={[
          buildDream({ id: 1, date: '2026-08-01', narrative: '<p>First dream that night.</p>' }),
          buildDream({ id: 2, date: '2026-08-01', narrative: '<p>Second dream that night.</p>' }),
        ]}
      />,
    );

    expect(screen.getByText('First dream that night.')).toBeInTheDocument();
    expect(screen.getByText('Second dream that night.')).toBeInTheDocument();
  });

  it('renders the day number and a stripped excerpt for each dream', () => {
    render(
      <DreamTimeline
        dreams={[
          buildDream({
            id: 1,
            date: '2026-08-07',
            narrative: '<p>It was a <strong>calm</strong> dream.</p>',
          }),
        ]}
      />,
    );

    expect(screen.getByText('07')).toBeInTheDocument();
    expect(screen.getByText('It was a calm dream.')).toBeInTheDocument();
  });
});
