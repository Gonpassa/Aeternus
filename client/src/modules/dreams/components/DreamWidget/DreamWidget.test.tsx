import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import type { DreamSummaryResponse } from '@nee3/shared-types';

const mockUseDreamSummary = vi.fn();

vi.mock('@tanstack/react-router', () => ({
  Link: ({
    to,
    params,
    children,
  }: {
    to: string;
    params?: { dreamId: string };
    children: ReactNode;
  }) => <a href={params ? to.replace('$dreamId', params.dreamId) : to}>{children}</a>,
}));

vi.mock('../../api/dreamHooks.ts', () => ({
  useDreamSummary: () => mockUseDreamSummary(),
}));

const { DreamWidget } = await import('./DreamWidget.tsx');

const CARD_LABEL = 'Dream Journal';
const HEADLINE = 'Record last night’s dream';
const CTA = 'Record a dream';
const FIRST_DREAM_PROMPT =
  'When a dream follows you into the morning, this is the place to set it down.';

const loaded = (data: DreamSummaryResponse) => ({ data, isPending: false });

// The card's visible text, with aria-hidden chrome (the catalog number) removed -
// the surface the no-metrics assertions run against.
const visibleText = (container: HTMLElement): string => {
  const clone = container.cloneNode(true) as HTMLElement;
  clone.querySelectorAll('[aria-hidden="true"]').forEach((node) => node.remove());
  return clone.textContent ?? '';
};

describe('DreamWidget', () => {
  beforeEach(() => {
    mockUseDreamSummary.mockReset();
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-09-14T08:00:00'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('shows the loading gate and none of the card content while the request is in flight', () => {
    mockUseDreamSummary.mockReturnValue({ data: undefined, isPending: true });

    render(<DreamWidget />);

    expect(screen.getByRole('status')).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: CTA })).not.toBeInTheDocument();
    expect(screen.queryByText('See also')).not.toBeInTheDocument();
  });

  it('still offers the record action when the summary request fails', () => {
    mockUseDreamSummary.mockReturnValue({ data: undefined, isPending: false });

    render(<DreamWidget />);

    expect(screen.getByRole('link', { name: CTA })).toHaveAttribute('href', '/dreams/new');
    expect(screen.queryByText('See also')).not.toBeInTheDocument();
    expect(screen.queryByText(FIRST_DREAM_PROMPT)).not.toBeInTheDocument();
  });

  it('shows the first-record prompt and no Re-encounter line when there are no dreams', () => {
    mockUseDreamSummary.mockReturnValue(loaded({ hasAnyDreams: false, reEncounter: null }));

    const { container } = render(<DreamWidget />);

    expect(screen.getByText(FIRST_DREAM_PROMPT)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: CTA })).toHaveAttribute('href', '/dreams/new');
    expect(screen.queryByText('See also')).not.toBeInTheDocument();

    const leftover = visibleText(container)
      .replace(CARD_LABEL, '')
      .replace(HEADLINE, '')
      .replace(FIRST_DREAM_PROMPT, '')
      .replace(CTA, '');
    expect(leftover.trim()).toBe('');
  });

  it('shows only the record action when dreams exist but none is eligible', () => {
    mockUseDreamSummary.mockReturnValue(loaded({ hasAnyDreams: true, reEncounter: null }));

    const { container } = render(<DreamWidget />);

    expect(screen.getByRole('link', { name: CTA })).toHaveAttribute('href', '/dreams/new');
    expect(screen.queryByText('See also')).not.toBeInTheDocument();

    // No explanatory text in the empty slot: nothing renders beyond the record zone.
    const leftover = visibleText(container)
      .replace(CARD_LABEL, '')
      .replace(HEADLINE, '')
      .replace(CTA, '');
    expect(leftover.trim()).toBe('');
  });

  it('shows the age phrase and snippet for a populated summary, linking to the Analysis page', () => {
    mockUseDreamSummary.mockReturnValue(
      loaded({
        hasAnyDreams: true,
        reEncounter: {
          id: 9,
          date: '2026-08-30',
          narrative: '<p>Running through a <em>flooded</em> library.</p>',
        },
      }),
    );

    render(<DreamWidget />);

    expect(screen.getByText('See also')).toBeInTheDocument();
    expect(screen.getByText('A dream from 15 days ago')).toBeInTheDocument();
    const line = screen.getByRole('link', { name: /Running through a flooded library\./ });
    expect(line).toHaveAttribute('href', '/dreams/9');
    expect(screen.getByRole('link', { name: CTA })).toHaveAttribute('href', '/dreams/new');
  });

  it('truncates a long narrative at a word boundary with an ellipsis', () => {
    mockUseDreamSummary.mockReturnValue(
      loaded({
        hasAnyDreams: true,
        reEncounter: {
          id: 9,
          date: '2026-08-30',
          narrative: `<p>${'wandering the same corridor '.repeat(12)}</p>`,
        },
      }),
    );

    render(<DreamWidget />);

    expect(screen.getByText(/corridor…$/)).toBeInTheDocument();
  });

  it('shows no digits anywhere outside the age phrase', () => {
    mockUseDreamSummary.mockReturnValue(
      loaded({
        hasAnyDreams: true,
        reEncounter: {
          id: 9,
          date: '2026-08-30',
          narrative: '<p>Running through a flooded library.</p>',
        },
      }),
    );

    const { container } = render(<DreamWidget />);

    const outsideAgePhrase = visibleText(container).replace('A dream from 15 days ago', '');
    expect(outsideAgePhrase).not.toMatch(/\d/);
  });
});
