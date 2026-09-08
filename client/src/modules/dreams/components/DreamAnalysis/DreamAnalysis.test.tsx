import { describe, expect, it, vi, beforeEach } from 'vitest';
import { forwardRef, useImperativeHandle, type Ref } from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import type { AnalysisPass, AnchorWithAttachments, Dream } from '@nee3/shared-types';

// Mirrors EntryForm.test.tsx's convention of mocking RichTextEditor rather than exercising
// real Tiptap/ProseMirror in jsdom. This fake exposes a minimal editor double via ref (the
// surface DreamAnalysis actually calls: chain().setTextSelection().setMark()/.unsetMark()
// .run(), getHTML(), state.selection, state.doc.textBetween()) and a button to simulate a
// text selection, since jsdom has no real selection range support to drive.
let currentSelection: { from: number; to: number } = { from: 0, to: 0 };
const setMarkSpy = vi.fn();
const unsetMarkSpy = vi.fn();
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
        onChange?: (html: string) => void;
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
        unsetMark: vi.fn((name: string) => {
          unsetMarkSpy(name);
          return chain;
        }),
        run: runSpy,
      };
      const fakeEditor = {
        getHTML: () => value,
        get state() {
          return {
            selection: currentSelection,
            doc: { textBetween: () => 'a city made of glass' },
          };
        },
        chain: () => chain,
      };
      useImperativeHandle(ref, () => fakeEditor);

      return (
        <div>
          <textarea
            aria-label="Narrative"
            value={value}
            onChange={(e) => onChange?.(e.target.value)}
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
vi.mock('../../tiptap/AnchorMark.ts', () => ({
  AnchorMark: {},
  ANCHOR_MARK_NAME: 'anchor',
  anchorIdsInRange: () => mockAnchorIdsInRange(),
  anchorIdsInDocument: () => [] as number[],
}));

const createAnchorMutateAsync = vi.fn(async () => ({ id: 99, dreamId: 1, createdAt: '' }));
const deleteAnchorMutateAsync = vi.fn(async () => {});
const updateDreamMutateAsync = vi.fn(async () => ({}));
const createEmotionalBeatMutateAsync = vi.fn(async () => ({}));
const updateEmotionalBeatMutateAsync = vi.fn(async () => ({}));
const deleteEmotionalBeatMutate = vi.fn();
const tagSymbolMutateAsync = vi.fn(async () => ({}));
const untagSymbolMutate = vi.fn();
const createAssociationMutateAsync = vi.fn(async () => ({}));
const updateAssociationMutateAsync = vi.fn(async () => ({}));
const deleteAssociationMutate = vi.fn();
const createAnalysisPassMutateAsync = vi.fn(async () => ({}));

vi.mock('../../api/dreamHooks.ts', () => ({
  useUpdateDream: () => ({ mutateAsync: updateDreamMutateAsync, isPending: false }),
  useCreateAnchor: () => ({ mutateAsync: createAnchorMutateAsync }),
  useDeleteAnchor: () => ({ mutateAsync: deleteAnchorMutateAsync }),
  useCreateEmotionalBeat: () => ({ mutateAsync: createEmotionalBeatMutateAsync }),
  useUpdateEmotionalBeat: () => ({ mutateAsync: updateEmotionalBeatMutateAsync }),
  useDeleteEmotionalBeat: () => ({ mutate: deleteEmotionalBeatMutate }),
  useTagSymbol: () => ({ mutateAsync: tagSymbolMutateAsync }),
  useUntagSymbol: () => ({ mutate: untagSymbolMutate }),
  useCreateAssociation: () => ({ mutateAsync: createAssociationMutateAsync }),
  useUpdateAssociation: () => ({ mutateAsync: updateAssociationMutateAsync }),
  useDeleteAssociation: () => ({ mutate: deleteAssociationMutate }),
  useCreateAnalysisPass: () => ({ mutateAsync: createAnalysisPassMutateAsync }),
  useSymbols: () => ({
    data: [
      { id: 3, userId: 1, name: 'Ocean', createdAt: '' },
      { id: 4, userId: 1, name: 'Falling', createdAt: '' },
    ],
  }),
}));

const { DreamAnalysis } = await import('./DreamAnalysis.tsx');

const dream: Dream = {
  id: 1,
  userId: 1,
  date: '2026-08-01',
  narrative: '<p>I was <span data-anchor-id="7">flying over</span> a city made of glass.</p>',
  createdAt: '2026-08-01T00:00:00.000Z',
  updatedAt: '2026-08-01T00:00:00.000Z',
};

const anchor: AnchorWithAttachments = {
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
  symbolAttachments: [
    {
      id: 200,
      symbolId: 3,
      anchorId: 7,
      createdAt: '2026-08-01T00:00:00.000Z',
      symbolName: 'Ocean',
      associations: [
        {
          id: 300,
          symbolAttachmentId: 200,
          content: 'guardian figure',
          kind: 'personal',
          createdAt: '2026-08-01T00:00:00.000Z',
          updatedAt: '2026-08-01T00:00:00.000Z',
        },
      ],
    },
  ],
};

const analyticPass: AnalysisPass = {
  id: 500,
  dreamId: 1,
  anchorId: 7,
  type: 'analytic',
  content: 'The glass city echoes the office move.',
  createdAt: '2026-08-02T10:00:00.000Z',
};

const syntheticPass: AnalysisPass = {
  id: 501,
  dreamId: 1,
  anchorId: null,
  type: 'synthetic',
  content: 'The dream points toward wanting to be seen.',
  createdAt: '2026-08-03T10:00:00.000Z',
};

const renderAnalysis = (
  overrides: { anchors?: AnchorWithAttachments[]; analysisPasses?: AnalysisPass[] } = {},
) =>
  render(
    <DreamAnalysis
      dream={dream}
      anchors={overrides.anchors ?? [anchor]}
      analysisPasses={overrides.analysisPasses ?? []}
    />,
  );

const activateAnchor = () =>
  fireEvent.click(screen.getByRole('button', { name: /highlight anchored passage/i }));

beforeEach(() => {
  vi.clearAllMocks();
  // jsdom has no real selection-range support to drive from a simulated selection - stub
  // window.getSelection so the toolbar's positioning lookup finds a range to measure.
  vi.spyOn(window, 'getSelection').mockReturnValue({
    rangeCount: 1,
    getRangeAt: () => ({
      getBoundingClientRect: () => ({ top: 100, left: 50, width: 40, height: 20 }),
    }),
    removeAllRanges: () => {},
  } as unknown as Selection);
  currentSelection = { from: 0, to: 0 };
  mockAnchorIdsInRange.mockReturnValue([]);
});

describe('DreamAnalysis', () => {
  it('renders a margin note with the anchored excerpt, beats, symbols, and associations', () => {
    renderAnalysis();

    expect(
      screen.getByRole('button', { name: /highlight anchored passage .*flying over/i }),
    ).toBeInTheDocument();
    expect(screen.getByText('dread')).toBeInTheDocument();
    expect(screen.getByText('Ocean')).toBeInTheDocument();
    expect(screen.getByText(/guardian figure/)).toBeInTheDocument();
  });

  it('offers beat, symbol, and analytic note actions over a text selection', async () => {
    renderAnalysis();

    fireEvent.click(screen.getByText('Simulate selection'));

    const toolbar = await screen.findByRole('toolbar', { name: 'Attach to selected passage' });
    expect(toolbar).toBeInTheDocument();
    expect(screen.getByText('Add emotional beat')).toBeInTheDocument();
    expect(screen.getByText('Tag symbol')).toBeInTheDocument();
    expect(screen.getByText('Add analytic note')).toBeInTheDocument();
  });

  it('creates an anchor, marks and persists the passage, and adds the beat for a fresh selection', async () => {
    renderAnalysis({ anchors: [] });

    fireEvent.click(screen.getByText('Simulate selection'));
    fireEvent.click(await screen.findByText('Add emotional beat'));

    fireEvent.change(await screen.findByLabelText(/what emotion did this moment carry/i), {
      target: { value: 'awe' },
    });
    fireEvent.click(screen.getByText('Save'));

    await waitFor(() => expect(createAnchorMutateAsync).toHaveBeenCalled());
    expect(setMarkSpy).toHaveBeenCalledWith('anchor', { anchorId: 99 });
    await waitFor(() =>
      expect(updateDreamMutateAsync).toHaveBeenCalledWith(
        expect.objectContaining({ date: dream.date }),
      ),
    );
    await waitFor(() =>
      expect(createEmotionalBeatMutateAsync).toHaveBeenCalledWith({
        anchorId: 99,
        input: { label: 'awe' },
      }),
    );
  });

  it('rolls back the mark and the anchor when the first attachment fails', async () => {
    createEmotionalBeatMutateAsync.mockRejectedValueOnce(new Error('boom'));
    renderAnalysis({ anchors: [] });

    fireEvent.click(screen.getByText('Simulate selection'));
    fireEvent.click(await screen.findByText('Add emotional beat'));
    fireEvent.change(await screen.findByLabelText(/what emotion did this moment carry/i), {
      target: { value: 'awe' },
    });
    fireEvent.click(screen.getByText('Save'));

    await waitFor(() => expect(deleteAnchorMutateAsync).toHaveBeenCalledWith(99));
    expect(unsetMarkSpy).toHaveBeenCalledWith('anchor');
    // The dialog stays open for a retry.
    expect(screen.getByLabelText(/what emotion did this moment carry/i)).toBeInTheDocument();
  });

  it('reuses the overlapped anchor and opens its inline beat form instead of creating a new anchor', async () => {
    mockAnchorIdsInRange.mockReturnValue([7]);
    renderAnalysis();

    fireEvent.click(screen.getByText('Simulate selection'));
    fireEvent.click(await screen.findByText('Add emotional beat'));

    fireEvent.change(await screen.findByLabelText('Emotional beat'), {
      target: { value: 'longing' },
    });
    fireEvent.click(screen.getByText('Add beat'));

    await waitFor(() =>
      expect(createEmotionalBeatMutateAsync).toHaveBeenCalledWith({
        anchorId: 7,
        input: { label: 'longing' },
      }),
    );
    expect(createAnchorMutateAsync).not.toHaveBeenCalled();
    expect(setMarkSpy).not.toHaveBeenCalled();
  });

  it('tags a symbol on an existing anchor via case-insensitive vocabulary suggestions', async () => {
    renderAnalysis();

    activateAnchor();
    fireEvent.click(screen.getByText('+ symbol'));

    fireEvent.change(screen.getByLabelText('Symbol name'), { target: { value: 'oce' } });
    fireEvent.click(await screen.findByRole('button', { name: 'Ocean' }));

    await waitFor(() =>
      expect(tagSymbolMutateAsync).toHaveBeenCalledWith({
        anchorId: 7,
        input: { name: 'Ocean' },
      }),
    );
  });

  it('shows the symbol remove affordance only while the anchor is active', () => {
    renderAnalysis();

    expect(screen.queryByLabelText('Remove symbol Ocean')).not.toBeInTheDocument();

    activateAnchor();
    fireEvent.click(screen.getByLabelText('Remove symbol Ocean'));

    expect(untagSymbolMutate).toHaveBeenCalledWith(200);
  });

  it('adds an association with a chosen kind', async () => {
    renderAnalysis();

    activateAnchor();
    fireEvent.click(screen.getByText('+ association'));

    fireEvent.change(screen.getByLabelText('Association'), {
      target: { value: 'the sea as the unconscious' },
    });
    fireEvent.click(screen.getByRole('radio', { name: 'Cultural' }));
    fireEvent.click(screen.getByText('Add'));

    await waitFor(() =>
      expect(createAssociationMutateAsync).toHaveBeenCalledWith({
        symbolAttachmentId: 200,
        input: { content: 'the sea as the unconscious', kind: 'cultural' },
      }),
    );
  });

  it('edits and deletes an existing association', async () => {
    renderAnalysis();

    activateAnchor();
    fireEvent.click(screen.getByLabelText('Edit association guardian figure'));
    const input = screen.getByLabelText('Association');
    expect(input).toHaveValue('guardian figure');
    fireEvent.change(input, { target: { value: 'protective older brother' } });
    fireEvent.click(screen.getByText('Save'));

    await waitFor(() =>
      expect(updateAssociationMutateAsync).toHaveBeenCalledWith({
        id: 300,
        input: { content: 'protective older brother', kind: 'personal' },
      }),
    );

    fireEvent.click(screen.getByLabelText('Delete association guardian figure'));
    expect(deleteAssociationMutate).toHaveBeenCalledWith(300);
  });

  it('edits and deletes an emotional beat from the margin note', async () => {
    renderAnalysis();

    activateAnchor();
    fireEvent.click(screen.getByLabelText('Edit emotional beat dread'));
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

    fireEvent.click(screen.getByLabelText('Delete emotional beat dread'));
    expect(deleteEmotionalBeatMutate).toHaveBeenCalledWith(40);
  });

  it('shows one pass view at a time, chronological and without edit or delete controls', () => {
    renderAnalysis({ analysisPasses: [analyticPass, syntheticPass] });

    expect(screen.getByText(analyticPass.content)).toBeInTheDocument();
    expect(screen.queryByText(syntheticPass.content)).not.toBeInTheDocument();
    // The anchored analytic pass carries its excerpt stamp.
    expect(screen.getAllByText(/flying over/).length).toBeGreaterThan(1);

    fireEvent.click(screen.getByRole('tab', { name: 'Synthetic' }));
    expect(screen.getByText(syntheticPass.content)).toBeInTheDocument();
    expect(screen.queryByText(analyticPass.content)).not.toBeInTheDocument();

    // Passes are append-only: no edit or delete affordances anywhere in the record
    // (the margin note's Edit buttons only exist while its anchor is active).
    expect(screen.queryByText('Edit')).not.toBeInTheDocument();
    expect(screen.queryByText('Delete')).not.toBeInTheDocument();
  });

  it('submits a synthetic pass for the whole dream', async () => {
    renderAnalysis();

    fireEvent.click(screen.getByRole('tab', { name: 'Synthetic' }));
    fireEvent.change(screen.getByLabelText('New synthetic pass'), {
      target: { value: 'A pull toward the open.' },
    });
    fireEvent.click(screen.getByText('Add to record'));

    await waitFor(() =>
      expect(createAnalysisPassMutateAsync).toHaveBeenCalledWith({
        type: 'synthetic',
        content: 'A pull toward the open.',
      }),
    );
  });

  it('anchors an analytic note to a fresh selection through the pending flow', async () => {
    renderAnalysis({ anchors: [] });

    fireEvent.click(screen.getByText('Simulate selection'));
    fireEvent.click(await screen.findByText('Add analytic note'));

    fireEvent.change(screen.getByLabelText('New analytic pass'), {
      target: { value: 'Glass recurs when exposure is on my mind.' },
    });
    fireEvent.click(screen.getByText('Add to record'));

    await waitFor(() => expect(createAnchorMutateAsync).toHaveBeenCalled());
    expect(setMarkSpy).toHaveBeenCalledWith('anchor', { anchorId: 99 });
    await waitFor(() =>
      expect(createAnalysisPassMutateAsync).toHaveBeenCalledWith({
        type: 'analytic',
        content: 'Glass recurs when exposure is on my mind.',
        anchorId: 99,
      }),
    );
  });
});
