import { describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MarkedRangeCalendar, computeNextRange, toIsoDate } from './MarkedRangeCalendar.tsx';

describe('computeNextRange', () => {
  it('starts a one-day range on the first click', () => {
    const clicked = new Date(2026, 7, 15);
    expect(computeNextRange({}, clicked)).toEqual({ from: clicked, to: clicked });
  });

  it('extends the range on a second, later click', () => {
    const first = new Date(2026, 7, 10);
    const second = new Date(2026, 7, 20);
    expect(computeNextRange({ from: first, to: first }, second)).toEqual({
      from: first,
      to: second,
    });
  });

  it('resets the range when the second click is before the current start', () => {
    const first = new Date(2026, 7, 15);
    const earlier = new Date(2026, 7, 5);
    expect(computeNextRange({ from: first, to: first }, earlier)).toEqual({
      from: earlier,
      to: earlier,
    });
  });

  it('starts a fresh one-day range on the click after a completed two-day range', () => {
    const from = new Date(2026, 7, 5);
    const to = new Date(2026, 7, 15);
    const next = new Date(2026, 7, 10);
    expect(computeNextRange({ from, to }, next)).toEqual({ from: next, to: next });
  });
});

describe('MarkedRangeCalendar', () => {
  const visibleMonth = new Date(2026, 7, 1);

  it('only renders marked days as enabled, clickable buttons', () => {
    const markedDates = new Map([['2026-08-15', '#A8532F']]);
    render(
      <MarkedRangeCalendar
        markedDates={markedDates}
        visibleMonth={visibleMonth}
        onVisibleMonthChange={vi.fn()}
        selectedRange={{}}
        onRangeChange={vi.fn()}
      />,
    );

    expect(screen.getByRole('button', { name: '2026-08-15' })).not.toBeDisabled();
    expect(screen.getByRole('button', { name: '2026-08-16' })).toBeDisabled();
  });

  it('calls onRangeChange when a marked day is clicked', () => {
    const markedDates = new Map([['2026-08-15', '#A8532F']]);
    const handleRangeChange = vi.fn();
    render(
      <MarkedRangeCalendar
        markedDates={markedDates}
        visibleMonth={visibleMonth}
        onVisibleMonthChange={vi.fn()}
        selectedRange={{}}
        onRangeChange={handleRangeChange}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: '2026-08-15' }));

    expect(handleRangeChange).toHaveBeenCalledWith({
      from: new Date(2026, 7, 15),
      to: new Date(2026, 7, 15),
    });
  });

  it('does not call onRangeChange when an unmarked day is clicked', () => {
    const markedDates = new Map([['2026-08-15', '#A8532F']]);
    const handleRangeChange = vi.fn();
    render(
      <MarkedRangeCalendar
        markedDates={markedDates}
        visibleMonth={visibleMonth}
        onVisibleMonthChange={vi.fn()}
        selectedRange={{}}
        onRangeChange={handleRangeChange}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: '2026-08-16' }));

    expect(handleRangeChange).not.toHaveBeenCalled();
  });

  it('renders both the visible month and the next month', () => {
    const markedDates = new Map([
      ['2026-08-15', '#A8532F'],
      ['2026-09-01', '#55684A'],
    ]);
    render(
      <MarkedRangeCalendar
        markedDates={markedDates}
        visibleMonth={visibleMonth}
        onVisibleMonthChange={vi.fn()}
        selectedRange={{}}
        onRangeChange={vi.fn()}
      />,
    );

    expect(screen.getByRole('button', { name: '2026-08-15' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '2026-09-01' })).toBeInTheDocument();
  });
});

describe('toIsoDate', () => {
  it('formats a date as YYYY-MM-DD', () => {
    expect(toIsoDate(new Date(2026, 7, 5))).toBe('2026-08-05');
  });
});
