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

const existingEntry: Entry = {
  id: 42,
  userId: 1,
  date: '2026-08-01',
  title: 'Existing title',
  primaryMood: 'calm',
  specificEmotion: 'peaceful',
  content: '<p>Existing content</p>',
  createdAt: '2026-08-01T00:00:00.000Z',
  updatedAt: '2026-08-01T00:00:00.000Z',
};

describe('EntryForm date-collision', () => {
  it('switches into edit mode and pre-fills the form when the chosen date already has an entry', async () => {
    mockUseEntryByDate.mockImplementation((date: string | null) => ({
      data: date === '2026-08-01' ? existingEntry : null,
    }));
    const handleSubmit = vi.fn().mockResolvedValue(undefined);
    render(<EntryForm onSubmit={handleSubmit} />);

    fireEvent.change(screen.getByLabelText(/date/i), { target: { value: '2026-08-01' } });

    await waitFor(() => {
      expect(screen.getByLabelText(/title/i)).toHaveValue('Existing title');
    });
    expect(screen.getByText(/editing it instead/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('radio', { name: /calm/i }));
    fireEvent.click(screen.getByRole('radio', { name: 'peaceful' }));
    fireEvent.click(screen.getByRole('button', { name: /save entry/i }));

    await waitFor(() => {
      expect(handleSubmit).toHaveBeenCalledWith(
        expect.objectContaining({ date: '2026-08-01', title: 'Existing title' }),
        42,
      );
    });
  });

  it('clears the pre-filled fields when the date changes away from a collision', async () => {
    mockUseEntryByDate.mockImplementation((date: string | null) => ({
      data: date === '2026-08-01' ? existingEntry : null,
    }));
    const handleSubmit = vi.fn().mockResolvedValue(undefined);
    render(<EntryForm onSubmit={handleSubmit} />);

    fireEvent.change(screen.getByLabelText(/date/i), { target: { value: '2026-08-01' } });

    await waitFor(() => {
      expect(screen.getByLabelText(/title/i)).toHaveValue('Existing title');
    });
    expect(screen.getByRole('radio', { name: /calm/i })).toHaveAttribute('aria-checked', 'true');

    fireEvent.change(screen.getByLabelText(/date/i), { target: { value: '2026-08-05' } });

    await waitFor(() => {
      expect(screen.getByLabelText(/title/i)).toHaveValue('');
    });
    expect(screen.getByLabelText(/content/i)).toHaveValue('');
    expect(screen.getByRole('radio', { name: /calm/i })).toHaveAttribute('aria-checked', 'false');
    expect(screen.queryByRole('radiogroup', { name: /specific emotion/i })).not.toBeInTheDocument();
    expect(screen.queryByText(/editing it instead/i)).not.toBeInTheDocument();
  });

  it('does not clear a user-typed title while the collision lookup is still loading', async () => {
    // Start with a resolved "no collision" response for the initial (today) date so the
    // form isn't loading when the user starts typing.
    mockUseEntryByDate.mockImplementation(() => ({ data: null, isLoading: false }));
    const handleSubmit = vi.fn().mockResolvedValue(undefined);
    const { rerender } = render(<EntryForm onSubmit={handleSubmit} />);

    fireEvent.change(screen.getByLabelText(/title/i), { target: { value: 'My draft title' } });
    expect(screen.getByLabelText(/title/i)).toHaveValue('My draft title');

    // Now the user changes the date to a never-before-queried date. The query enters its
    // loading transient: data is undefined, isLoading is true. The form must NOT wipe the
    // user's typed title during this window.
    mockUseEntryByDate.mockImplementation(() => ({ data: undefined, isLoading: true }));
    fireEvent.change(screen.getByLabelText(/date/i), { target: { value: '2026-09-09' } });
    rerender(<EntryForm onSubmit={handleSubmit} />);

    expect(screen.getByLabelText(/title/i)).toHaveValue('My draft title');

    // The lookup resolves: no collision for this date either. Since it never collided,
    // the title must still not be cleared.
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
});
