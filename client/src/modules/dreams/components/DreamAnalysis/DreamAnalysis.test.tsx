import { describe, expect, it, vi, beforeEach } from 'vitest';
import { forwardRef, useImperativeHandle, type Ref } from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import type { AnchorWithBeats, Dream } from '@nee3/shared-types';

// Mirrors EntryForm.test.tsx's convention of mocking RichTextEditor rather than exercising
// real Tiptap/ProseMirror in jsdom. This fake exposes a minimal editor double via ref (the
// surface DreamAnalysis actually calls: chain().setTextSelection().setMark().run(),
// getHTML()) and a button to simulate a text selection, since jsdom has no real selection
// range support to drive.
let currentSelection: { from: number; to: number } = { from: 0, to: 0 };
const setMarkSpy = vi.fn();
const runSpy = vi.fn();

vi.mock('../../../../atoms/RichTextEditor/RichTextEditor.tsx', () => ({
  RichTextEditor: forwardRef(
    (
      {
        value,
        onChange,
        onSelectionUpdate,
      }: {
        value: string;
        onChange: (html: string) => void;
        onSelectionUpdate?: (editor: unknown) => void;
      },
      ref: Ref<unknown>,
    ) => {
      const chain = {
        setTextSelection: vi.fn().mockReturnThis(),
        setMark: vi.fn((name: string, attrs: unknown) => {
          setMarkSpy(name, attrs);
          return chain;
        }),
        run: runSpy,
      };
      const fakeEditor = {
        getHTML: () => value,
        get state() {
          return { selection: currentSelection };
        },
        chain: () => chain,
      };
      useImperativeHandle(ref, () => fakeEditor);

      return (
        <div>
          <textarea
            aria-label="Narrative"
            value={value}
            onChange={(e) => onChange(e.target.value)}
          />
          <button
            type="button"
            onClick={() => {
              currentSelection = { from: 2, to: 8 };
              onSelectionUpdate?.(fakeEditor);
            }}
          >
            Simulate selection
          </button>
        </div>
      );
    },
  ),
}));

const mockAnchorIdsInRange = vi.fn(() => [] as number[]);
const mockAnchorIdsInDocument = vi.fn(() => [] as number[]);
vi.mock('../../tiptap/AnchorMark.ts', () => ({
  AnchorMark: {},
  anchorIdsInRange: () => mockAnchorIdsInRange(),
  anchorIdsInDocument: () => mockAnchorIdsInDocument(),
}));

const createAnchorMutateAsync = vi.fn(async () => ({ id: 99, dreamId: 1, createdAt: '' }));
const createEmotionalBeatMutateAsync = vi.fn(async () => ({}));
const updateEmotionalBeatMutateAsync = vi.fn(async () => ({}));
const deleteEmotionalBeatMutate = vi.fn();
const deleteAnchorMutateAsync = vi.fn(async () => {});
const updateDreamMutateAsync = vi.fn(async () => ({}));

vi.mock('../../api/dreamHooks.ts', () => ({
  useCreateAnchor: () => ({ mutateAsync: createAnchorMutateAsync }),
  useCreateEmotionalBeat: () => ({ mutateAsync: createEmotionalBeatMutateAsync }),
  useUpdateEmotionalBeat: () => ({ mutateAsync: updateEmotionalBeatMutateAsync }),
  useDeleteEmotionalBeat: () => ({ mutate: deleteEmotionalBeatMutate }),
  useDeleteAnchor: () => ({ mutateAsync: deleteAnchorMutateAsync }),
  useUpdateDream: () => ({ mutateAsync: updateDreamMutateAsync, isPending: false }),
}));

const { DreamAnalysis } = await import('./DreamAnalysis.tsx');

const dream: Dream = {
  id: 1,
  userId: 1,
  date: '2026-08-01',
  narrative: '<p>I was flying over a city made of glass.</p>',
  createdAt: '2026-08-01T00:00:00.000Z',
  updatedAt: '2026-08-01T00:00:00.000Z',
};

const anchorWithBeat: AnchorWithBeats = {
  id: 7,
  dreamId: 1,
  createdAt: '2026-08-01T00:00:00.000Z',
  emotionalBeats: [
    {
      id: 40,
      anchorId: 7,
      label: 'dread',
      createdAt: '2026-08-01T00:00:00.000Z',
      updatedAt: '2026-08-01T00:00:00.000Z',
    },
  ],
};

beforeEach(() => {
  vi.clearAllMocks();
  // jsdom has no real selection-range support to drive from a simulated selection - stub
  // window.getSelection so the toolbar's positioning lookup finds a range to measure.
  vi.spyOn(window, 'getSelection').mockReturnValue({
    rangeCount: 1,
    getRangeAt: () => ({
      getBoundingClientRect: () => ({ top: 100, left: 50, width: 40, height: 20 }),
    }),
  } as unknown as Selection);
  currentSelection = { from: 0, to: 0 };
  mockAnchorIdsInRange.mockReturnValue([]);
  mockAnchorIdsInDocument.mockReturnValue([]);
});

describe('DreamAnalysis', () => {
  it('creates an anchor and applies the mark when attaching to a fresh selection', async () => {
    render(<DreamAnalysis dream={dream} anchors={[]} />);

    fireEvent.click(screen.getByText('Simulate selection'));
    fireEvent.click(await screen.findByText('Add emotional beat'));

    fireEvent.change(await screen.findByLabelText(/what emotion did this moment carry/i), {
      target: { value: 'awe' },
    });
    fireEvent.click(screen.getByText('Save'));

    await waitFor(() => expect(createAnchorMutateAsync).toHaveBeenCalled());
    expect(setMarkSpy).toHaveBeenCalledWith('anchor', { anchorId: 99 });
    expect(createEmotionalBeatMutateAsync).toHaveBeenCalledWith({
      anchorId: 99,
      input: { label: 'awe' },
    });
  });

  it('reuses an existing anchor when the selection overlaps one, without creating a new anchor', async () => {
    mockAnchorIdsInRange.mockReturnValue([7]);
    render(<DreamAnalysis dream={dream} anchors={[anchorWithBeat]} />);

    fireEvent.click(screen.getByText('Simulate selection'));
    fireEvent.click(await screen.findByText('Add emotional beat'));

    fireEvent.change(await screen.findByLabelText(/what emotion did this moment carry/i), {
      target: { value: 'longing' },
    });
    fireEvent.click(screen.getByText('Save'));

    await waitFor(() =>
      expect(createEmotionalBeatMutateAsync).toHaveBeenCalledWith({
        anchorId: 7,
        input: { label: 'longing' },
      }),
    );
    expect(createAnchorMutateAsync).not.toHaveBeenCalled();
    expect(setMarkSpy).not.toHaveBeenCalled();
  });

  it('warns before deleting an anchor whose text was removed, then deletes it and saves on confirm', async () => {
    // The known anchor (7) is no longer present anywhere in the document.
    mockAnchorIdsInDocument.mockReturnValue([]);
    render(<DreamAnalysis dream={dream} anchors={[anchorWithBeat]} />);

    fireEvent.click(screen.getByText('Save narrative'));

    expect(await screen.findByText('Delete anchored passages?')).toBeInTheDocument();
    expect(screen.getByText(/1 anchor and 1 emotional beat/)).toBeInTheDocument();
    expect(deleteAnchorMutateAsync).not.toHaveBeenCalled();

    fireEvent.click(screen.getByText('Delete and save'));

    await waitFor(() => expect(deleteAnchorMutateAsync).toHaveBeenCalledWith(7));
    expect(updateDreamMutateAsync).toHaveBeenCalledWith(
      expect.objectContaining({ date: dream.date }),
    );
  });

  it('cancelling the delete warning does not delete the anchor or save', async () => {
    mockAnchorIdsInDocument.mockReturnValue([]);
    render(<DreamAnalysis dream={dream} anchors={[anchorWithBeat]} />);

    fireEvent.click(screen.getByText('Save narrative'));
    expect(await screen.findByText('Delete anchored passages?')).toBeInTheDocument();

    fireEvent.click(screen.getByText('Cancel'));

    await waitFor(() =>
      expect(screen.queryByText('Delete anchored passages?')).not.toBeInTheDocument(),
    );
    expect(deleteAnchorMutateAsync).not.toHaveBeenCalled();
    expect(updateDreamMutateAsync).not.toHaveBeenCalled();
  });

  it('saves directly, without a warning, when no anchored text was removed', async () => {
    mockAnchorIdsInDocument.mockReturnValue([7]);
    render(<DreamAnalysis dream={dream} anchors={[anchorWithBeat]} />);

    fireEvent.click(screen.getByText('Save narrative'));

    await waitFor(() => expect(updateDreamMutateAsync).toHaveBeenCalled());
    expect(screen.queryByText('Delete anchored passages?')).not.toBeInTheDocument();
    expect(deleteAnchorMutateAsync).not.toHaveBeenCalled();
  });

  it('edits and deletes an existing emotional beat from the list', async () => {
    render(<DreamAnalysis dream={dream} anchors={[anchorWithBeat]} />);

    expect(screen.getByText('dread')).toBeInTheDocument();

    fireEvent.click(screen.getByText('Edit'));
    const input = await screen.findByLabelText(/what emotion did this moment carry/i);
    expect(input).toHaveValue('dread');
    fireEvent.change(input, { target: { value: 'unease' } });
    fireEvent.click(screen.getByText('Save'));

    await waitFor(() =>
      expect(updateEmotionalBeatMutateAsync).toHaveBeenCalledWith({
        id: 40,
        input: { label: 'unease' },
      }),
    );

    fireEvent.click(screen.getByText('Delete'));
    expect(deleteEmotionalBeatMutate).toHaveBeenCalledWith(40);
  });
});
