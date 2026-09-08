import { describe, expect, it, vi } from 'vitest';
import { render, renderHook, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { toIsoDate } from '../../../../utils/dateUtils.ts';
import { useRecoveryBuffer } from '../../hooks/useRecoveryBuffer.ts';

vi.mock('../../../../atoms/RichTextEditor/RichTextEditor.tsx', () => ({
  RichTextEditor: ({ value, onChange }: { value: string; onChange: (html: string) => void }) => (
    <textarea aria-label="Narrative" value={value} onChange={(e) => onChange(e.target.value)} />
  ),
}));

const { DreamForm } = await import('./DreamForm.tsx');

// The date-picker Calendar opens on the real current month and doesn't auto-navigate on
// selection, so test dates must stay within it (mirrors EntryForm.test.tsx's approach).
const today = new Date();
const [dayB] = [1, 5, 9, 13].filter((day) => day !== today.getDate());
const dateB = new Date(today.getFullYear(), today.getMonth(), dayB);
const isoB = toIsoDate(dateB);

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

describe('DreamForm', () => {
  it('saves the dream and calls onCreate with the narrative and date', async () => {
    const onCreate = vi.fn().mockResolvedValue(undefined);
    render(<DreamForm onCreate={onCreate} />);

    fireEvent.change(screen.getByLabelText(/narrative/i), {
      target: { value: '<p>I was flying over a city made of glass.</p>' },
    });
    fireEvent.click(screen.getByRole('button', { name: /save dream/i }));

    await waitFor(() => {
      expect(onCreate).toHaveBeenCalledWith(
        expect.objectContaining({ narrative: '<p>I was flying over a city made of glass.</p>' }),
      );
    });
  });

  it('blocks submission with an inline error when the narrative is empty', async () => {
    const onCreate = vi.fn().mockResolvedValue(undefined);
    render(<DreamForm onCreate={onCreate} />);

    fireEvent.click(screen.getByRole('button', { name: /save dream/i }));

    const error = await screen.findByRole('alert');
    expect(error).toHaveTextContent('Narrative is required');
    expect(onCreate).not.toHaveBeenCalled();
  });

  it('clears the recovery buffer after a successful save', async () => {
    window.localStorage.clear();
    const onCreate = vi.fn().mockResolvedValue(undefined);
    render(<DreamForm onCreate={onCreate} />);

    fireEvent.change(screen.getByLabelText(/narrative/i), {
      target: { value: '<p>A dream worth remembering.</p>' },
    });
    fireEvent.click(screen.getByRole('button', { name: /save dream/i }));

    await waitFor(() => expect(onCreate).toHaveBeenCalled());

    const { result } = renderHook(() => useRecoveryBuffer('new'));
    expect(result.current.read()).toBeNull();
  });

  it('restores unsaved input from the recovery buffer on mount', () => {
    window.localStorage.clear();
    const { result } = renderHook(() => useRecoveryBuffer('new'));
    result.current.write({ date: isoB, narrative: '<p>Restored from a previous session.</p>' });

    render(<DreamForm onCreate={vi.fn()} />);

    expect(screen.getByLabelText(/narrative/i)).toHaveValue(
      '<p>Restored from a previous session.</p>',
    );
  });

  it('confirms via a dialog before discarding when the form is dirty', async () => {
    const onDiscard = vi.fn();
    render(<DreamForm onCreate={vi.fn()} onDiscard={onDiscard} />);

    await selectDate(isoB);
    fireEvent.click(screen.getByRole('button', { name: /discard/i }));

    const dialog = await screen.findByRole('alertdialog');
    expect(within(dialog).getByText(/discard this dream/i)).toBeInTheDocument();
    expect(onDiscard).not.toHaveBeenCalled();

    fireEvent.click(within(dialog).getByRole('button', { name: /^discard$/i }));

    await waitFor(() => {
      expect(onDiscard).toHaveBeenCalled();
    });
  });

  it('does not confirm before discarding when nothing changed', () => {
    const onDiscard = vi.fn();
    render(<DreamForm onCreate={vi.fn()} onDiscard={onDiscard} />);

    fireEvent.click(screen.getByRole('button', { name: /discard/i }));

    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
    expect(onDiscard).toHaveBeenCalled();
  });
});
