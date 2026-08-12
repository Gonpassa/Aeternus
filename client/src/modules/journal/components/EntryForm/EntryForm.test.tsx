import { describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import type { Entry } from '@nee3/shared-types';

vi.mock('../RichTextEditor/RichTextEditor.tsx', () => ({
  RichTextEditor: ({ value, onChange }: { value: string; onChange: (html: string) => void }) => (
    <textarea aria-label="Content" value={value} onChange={(e) => onChange(e.target.value)} />
  ),
}));

const mockUseEntryByDate = vi.fn();
vi.mock('../../api/journalHooks.ts', () => ({
  useEntryByDate: (date: string | null) => mockUseEntryByDate(date),
}));

const { EntryForm } = await import('./EntryForm.tsx');

const toIso = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

// The date-picker Calendar opens on the real current month and doesn't
// auto-navigate on selection, so test dates must stay within it (mirrors the
// same constraint/approach as JournalCalendarFilter.test.tsx's `toIso`).
const today = new Date();
const dateA = new Date(today.getFullYear(), today.getMonth(), 1);
const dateB = new Date(today.getFullYear(), today.getMonth(), 5);
const dateC = new Date(today.getFullYear(), today.getMonth(), 9);
const isoA = toIso(dateA);
const isoB = toIso(dateB);
const isoC = toIso(dateC);

const existingEntry: Entry = {
  id: 42,
  userId: 1,
  date: isoA,
  title: 'Existing title',
  primaryMood: 'calm',
  specificEmotion: 'peaceful',
  content: '<p>Existing content</p>',
  createdAt: '2026-08-01T00:00:00.000Z',
  updatedAt: '2026-08-01T00:00:00.000Z',
};

// Opens the date popover and clicks the day matching the given YYYY-MM-DD string.
// The popover portals into document.body (outside the render container), and
// Calendar's own day buttons carry a `data-day` attribute set to
// `date.toLocaleDateString()` (see ui/calendar.tsx's CalendarDayButton) - the
// same query shape MarkedRangeCalendar.test.tsx uses via `data-iso`.
// Chakra's Popover settles its floating-ui placement asynchronously after the
// controlled `open` transition commits, which briefly re-renders (and
// re-keys) the portalled Calendar's day cells. Caching the button returned by
// an earlier, separately-awaited `waitFor` risks holding a reference to that
// now-detached first-generation node. Querying and clicking inside the same
// `waitFor` callback keeps the query and the click in the same synchronous
// pass, so whichever generation is live when the callback runs is the one
// that gets clicked - `clicked` guards against firing more than once across
// retries.
const selectDate = async (iso: string) => {
  fireEvent.click(screen.getByLabelText(/date/i));
  const parts = iso.split('-').map(Number);
  const target = new Date(parts[0] ?? 0, (parts[1] ?? 1) - 1, parts[2] ?? 1);
  let clicked = false;
  await waitFor(() => {
    if (clicked) return;
    const el = document.body.querySelector(`[data-day="${target.toLocaleDateString()}"]`);
    if (!el) throw new Error(`No day button for ${iso}`);
    clicked = true;
    fireEvent.click(el);
  });
};

describe('EntryForm date-collision', () => {
  it('switches into edit mode and pre-fills the form when the chosen date already has an entry', async () => {
    mockUseEntryByDate.mockImplementation((date: string | null) => ({
      data: date === isoA ? existingEntry : null,
    }));
    const handleSubmit = vi.fn().mockResolvedValue(undefined);
    render(<EntryForm onSubmit={handleSubmit} />);

    await selectDate(isoA);

    await waitFor(() => {
      expect(screen.getByLabelText(/title/i)).toHaveValue('Existing title');
    });
    expect(screen.getByText(/editing it instead/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('radio', { name: /calm/i }));
    fireEvent.click(screen.getByRole('radio', { name: 'peaceful' }));
    fireEvent.click(screen.getByRole('button', { name: /save entry/i }));

    await waitFor(() => {
      expect(handleSubmit).toHaveBeenCalledWith(
        expect.objectContaining({ date: isoA, title: 'Existing title' }),
        42,
      );
    });
  });

  it('clears the pre-filled fields when the date changes away from a collision', async () => {
    mockUseEntryByDate.mockImplementation((date: string | null) => ({
      data: date === isoA ? existingEntry : null,
    }));
    const handleSubmit = vi.fn().mockResolvedValue(undefined);
    render(<EntryForm onSubmit={handleSubmit} />);

    await selectDate(isoA);

    await waitFor(() => {
      expect(screen.getByLabelText(/title/i)).toHaveValue('Existing title');
    });
    expect(screen.getByRole('radio', { name: /calm/i })).toHaveAttribute('aria-checked', 'true');

    await selectDate(isoB);

    await waitFor(() => {
      expect(screen.getByLabelText(/title/i)).toHaveValue('');
    });
    expect(screen.getByLabelText(/content/i)).toHaveValue('');
    expect(screen.getByRole('radio', { name: /calm/i })).toHaveAttribute('aria-checked', 'false');
    expect(screen.queryByRole('radiogroup', { name: /specific emotion/i })).not.toBeInTheDocument();
    expect(screen.queryByText(/editing it instead/i)).not.toBeInTheDocument();
  });

  it('does not clear a user-typed title while the collision lookup is still loading', async () => {
    mockUseEntryByDate.mockImplementation(() => ({ data: null, isLoading: false }));
    const handleSubmit = vi.fn().mockResolvedValue(undefined);
    const { rerender } = render(<EntryForm onSubmit={handleSubmit} />);

    fireEvent.change(screen.getByLabelText(/title/i), { target: { value: 'My draft title' } });
    expect(screen.getByLabelText(/title/i)).toHaveValue('My draft title');

    mockUseEntryByDate.mockImplementation(() => ({ data: undefined, isLoading: true }));
    await selectDate(isoC);
    rerender(<EntryForm onSubmit={handleSubmit} />);

    expect(screen.getByLabelText(/title/i)).toHaveValue('My draft title');

    mockUseEntryByDate.mockImplementation(() => ({ data: null, isLoading: false }));
    rerender(<EntryForm onSubmit={handleSubmit} />);

    await waitFor(() => {
      expect(screen.getByLabelText(/title/i)).toHaveValue('My draft title');
    });
  });

  it('submits a plain create when no colliding entry exists', async () => {
    mockUseEntryByDate.mockReturnValue({ data: null });
    const handleSubmit = vi.fn().mockResolvedValue(undefined);
    render(<EntryForm onSubmit={handleSubmit} />);

    fireEvent.change(screen.getByLabelText(/title/i), { target: { value: 'New entry' } });
    fireEvent.click(screen.getByRole('radio', { name: /happy/i }));
    fireEvent.click(screen.getByRole('radio', { name: 'content' }));
    fireEvent.click(screen.getByRole('button', { name: /save entry/i }));

    await waitFor(() => {
      expect(handleSubmit).toHaveBeenCalledWith(
        expect.objectContaining({ title: 'New entry' }),
        undefined,
      );
    });
  });

  it('saves successfully with a primary mood but no specific emotion', async () => {
    mockUseEntryByDate.mockReturnValue({ data: null });
    const handleSubmit = vi.fn().mockResolvedValue(undefined);
    render(<EntryForm onSubmit={handleSubmit} />);

    fireEvent.change(screen.getByLabelText(/title/i), { target: { value: 'No specific mood' } });
    fireEvent.click(screen.getByRole('radio', { name: /happy/i }));
    fireEvent.click(screen.getByRole('button', { name: /save entry/i }));

    await waitFor(() => {
      expect(handleSubmit).toHaveBeenCalledWith(
        expect.objectContaining({ primaryMood: 'happy', specificEmotion: null }),
        undefined,
      );
    });
  });

  it('disables the date trigger in edit mode', () => {
    mockUseEntryByDate.mockReturnValue({ data: null });
    render(<EntryForm initialEntry={existingEntry} onSubmit={vi.fn()} />);

    expect(screen.getByLabelText(/date/i)).toBeDisabled();
  });
});
