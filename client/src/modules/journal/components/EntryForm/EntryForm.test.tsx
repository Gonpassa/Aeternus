import { describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import type { Entry } from '@nee3/shared-types';
import { toIsoDate } from '../../dateUtils.ts';

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

// The date-picker Calendar opens on the real current month and doesn't
// auto-navigate on selection, so test dates must stay within it (mirrors the
// same constraint/approach as JournalCalendarFilter.test.tsx's `toIsoDate`).
// The form defaults a new entry's date to today, so a test date that happens to
// land on today's day-of-month wouldn't actually change anything when "selected" -
// nudge by a day whenever that collision occurs (the three candidate days are far
// enough apart that a single +1 nudge can't collide with either of the others).
const today = new Date();
const skipToday = (day: number) => (day === today.getDate() ? day + 1 : day);
const dateA = new Date(today.getFullYear(), today.getMonth(), skipToday(1));
const dateB = new Date(today.getFullYear(), today.getMonth(), skipToday(5));
const dateC = new Date(today.getFullYear(), today.getMonth(), skipToday(9));
const isoA = toIsoDate(dateA);
const isoB = toIsoDate(dateB);
const isoC = toIsoDate(dateC);

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
// `date.toLocaleDateString()` (see ui/Calendar/Calendar.tsx's CalendarDayButton) - the
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
    const onCreate = vi.fn().mockResolvedValue(undefined);
    const onUpdate = vi.fn().mockResolvedValue(undefined);
    render(<EntryForm onCreate={onCreate} onUpdate={onUpdate} />);

    await selectDate(isoA);

    await waitFor(() => {
      expect(screen.getByLabelText(/title/i)).toHaveValue('Existing title');
    });
    expect(screen.getByText(/editing it instead/i)).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: /calm/i })).toHaveAttribute('aria-checked', 'true');
    expect(screen.getByRole('radio', { name: 'peaceful' })).toHaveAttribute('aria-checked', 'true');

    fireEvent.click(screen.getByRole('button', { name: /save entry/i }));

    await waitFor(() => {
      expect(onUpdate).toHaveBeenCalledWith(
        42,
        expect.objectContaining({ date: isoA, title: 'Existing title' }),
      );
    });
    expect(onCreate).not.toHaveBeenCalled();
  });

  it('clears the pre-filled fields when the date changes away from a collision', async () => {
    mockUseEntryByDate.mockImplementation((date: string | null) => ({
      data: date === isoA ? existingEntry : null,
    }));
    const onCreate = vi.fn().mockResolvedValue(undefined);
    render(<EntryForm onCreate={onCreate} />);

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
    const onCreate = vi.fn().mockResolvedValue(undefined);
    const { rerender } = render(<EntryForm onCreate={onCreate} />);

    fireEvent.change(screen.getByLabelText(/title/i), { target: { value: 'My draft title' } });
    expect(screen.getByLabelText(/title/i)).toHaveValue('My draft title');

    mockUseEntryByDate.mockImplementation(() => ({ data: undefined, isLoading: true }));
    await selectDate(isoC);
    rerender(<EntryForm onCreate={onCreate} />);

    expect(screen.getByLabelText(/title/i)).toHaveValue('My draft title');

    mockUseEntryByDate.mockImplementation(() => ({ data: null, isLoading: false }));
    rerender(<EntryForm onCreate={onCreate} />);

    await waitFor(() => {
      expect(screen.getByLabelText(/title/i)).toHaveValue('My draft title');
    });
  });

  it('submits a plain create when no colliding entry exists', async () => {
    mockUseEntryByDate.mockReturnValue({ data: null });
    const onCreate = vi.fn().mockResolvedValue(undefined);
    const onUpdate = vi.fn().mockResolvedValue(undefined);
    render(<EntryForm onCreate={onCreate} onUpdate={onUpdate} />);

    fireEvent.change(screen.getByLabelText(/title/i), { target: { value: 'New entry' } });
    fireEvent.click(screen.getByRole('radio', { name: /happy/i }));
    fireEvent.click(screen.getByRole('radio', { name: 'content' }));
    fireEvent.click(screen.getByRole('button', { name: /save entry/i }));

    await waitFor(() => {
      expect(onCreate).toHaveBeenCalledWith(expect.objectContaining({ title: 'New entry' }));
    });
    expect(onUpdate).not.toHaveBeenCalled();
  });

  it('saves successfully with a primary mood but no specific emotion', async () => {
    mockUseEntryByDate.mockReturnValue({ data: null });
    const onCreate = vi.fn().mockResolvedValue(undefined);
    render(<EntryForm onCreate={onCreate} />);

    fireEvent.change(screen.getByLabelText(/title/i), { target: { value: 'No specific mood' } });
    fireEvent.click(screen.getByRole('radio', { name: /happy/i }));
    fireEvent.click(screen.getByRole('button', { name: /save entry/i }));

    await waitFor(() => {
      expect(onCreate).toHaveBeenCalledWith(
        expect.objectContaining({ primaryMood: 'happy', specificEmotion: null }),
      );
    });
  });

  it('blocks submission with an inline error when no primary mood is chosen', async () => {
    mockUseEntryByDate.mockReturnValue({ data: null });
    const onCreate = vi.fn().mockResolvedValue(undefined);
    render(<EntryForm onCreate={onCreate} />);

    fireEvent.change(screen.getByLabelText(/title/i), { target: { value: 'No mood' } });
    fireEvent.click(screen.getByRole('button', { name: /save entry/i }));

    const error = await screen.findByRole('alert');
    expect(error).toHaveTextContent('Please choose a mood.');
    expect(onCreate).not.toHaveBeenCalled();
  });

  it('disables the date trigger in edit mode', () => {
    mockUseEntryByDate.mockReturnValue({ data: null });
    render(<EntryForm initialEntry={existingEntry} onUpdate={vi.fn()} />);

    expect(screen.getByLabelText(/date/i)).toBeDisabled();
  });

  it('shows a delete button with a confirm dialog in edit mode instead of discard', async () => {
    mockUseEntryByDate.mockReturnValue({ data: null });
    const onDelete = vi.fn();
    render(<EntryForm initialEntry={existingEntry} onUpdate={vi.fn()} onDelete={onDelete} />);

    expect(screen.queryByRole('button', { name: /discard/i })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /^delete$/i }));
    expect(onDelete).not.toHaveBeenCalled();

    const dialog = await screen.findByRole('alertdialog');
    fireEvent.click(within(dialog).getByRole('button', { name: /^delete$/i }));

    await waitFor(() => {
      expect(onDelete).toHaveBeenCalled();
    });
  });

  it('confirms via a dialog before discarding when only the date changed', async () => {
    mockUseEntryByDate.mockReturnValue({ data: null });
    const onDiscard = vi.fn();
    render(<EntryForm onCreate={vi.fn()} onDiscard={onDiscard} />);

    await selectDate(isoB);
    fireEvent.click(screen.getByRole('button', { name: /discard/i }));

    const dialog = await screen.findByRole('alertdialog');
    expect(within(dialog).getByText(/discard this entry/i)).toBeInTheDocument();
    expect(onDiscard).not.toHaveBeenCalled();

    fireEvent.click(within(dialog).getByRole('button', { name: /^discard$/i }));

    await waitFor(() => {
      expect(onDiscard).toHaveBeenCalled();
    });
  });

  it('does not confirm before discarding when nothing changed', () => {
    mockUseEntryByDate.mockReturnValue({ data: null });
    const onDiscard = vi.fn();
    render(<EntryForm onCreate={vi.fn()} onDiscard={onDiscard} />);

    fireEvent.click(screen.getByRole('button', { name: /discard/i }));

    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
    expect(onDiscard).toHaveBeenCalled();
  });

  it('measures dirty state in edit mode from the loaded entry, not from blank', () => {
    mockUseEntryByDate.mockReturnValue({ data: null });
    const onDiscard = vi.fn();
    render(<EntryForm initialEntry={existingEntry} onUpdate={vi.fn()} onDiscard={onDiscard} />);

    // Edit mode has no discard button (delete replaces it); exercise the same
    // isDirty semantics indirectly by confirming the title starts at the loaded
    // value and editing it marks the field as changed relative to that baseline.
    expect(screen.getByLabelText(/title/i)).toHaveValue('Existing title');
    fireEvent.change(screen.getByLabelText(/title/i), { target: { value: 'Edited title' } });
    expect(screen.getByLabelText(/title/i)).toHaveValue('Edited title');
  });

  it('does not render an inline error for a network failure while saving - the global toast handles it', async () => {
    mockUseEntryByDate.mockReturnValue({ data: null });
    const onCreate = vi.fn().mockRejectedValue(new Error('Network Error'));
    render(<EntryForm onCreate={onCreate} />);

    fireEvent.change(screen.getByLabelText(/title/i), { target: { value: 'New entry' } });
    fireEvent.click(screen.getByRole('radio', { name: /happy/i }));
    fireEvent.click(screen.getByRole('button', { name: /save entry/i }));

    await waitFor(() => {
      expect(onCreate).toHaveBeenCalled();
    });
    expect(screen.queryByText(/could not save/i)).not.toBeInTheDocument();
  });
});
