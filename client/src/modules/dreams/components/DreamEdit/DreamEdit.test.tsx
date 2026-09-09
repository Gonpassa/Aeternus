import { describe, expect, it, vi, beforeEach } from 'vitest';
import { forwardRef, useImperativeHandle, type Ref } from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import type { AnchorWithAttachments, Dream } from '@nee3/shared-types';

const mocks = vi.hoisted(() => ({
  anchorIdsInDocument: vi.fn<() => number[]>(() => []),
  updateDream: vi.fn().mockResolvedValue(undefined),
  deleteAnchor: vi.fn().mockResolvedValue(undefined),
}));

// A fake editor instance is enough: anchorIdsInDocument (the only consumer) is mocked, so
// DreamEdit just needs the ref to be populated.
const fakeEditor = {};

vi.mock('../../../../atoms/RichTextEditor/RichTextEditor.tsx', () => ({
  RichTextEditor: forwardRef(
    (
      { value, onChange }: { value: string; onChange?: (html: string) => void },
      ref: Ref<unknown>,
    ) => {
      useImperativeHandle(ref, () => fakeEditor);
      return (
        <textarea
          aria-label="Narrative"
          value={value}
          onChange={(e) => onChange?.(e.target.value)}
        />
      );
    },
  ),
}));

vi.mock('../../tiptap/AnchorMark.ts', () => ({
  AnchorMark: {},
  ANCHOR_MARK_NAME: 'anchor',
  anchorIdsInDocument: mocks.anchorIdsInDocument,
}));

vi.mock('../../api/dreamHooks.ts', () => ({
  useUpdateDream: () => ({ mutateAsync: mocks.updateDream }),
  useDeleteAnchor: () => ({ mutateAsync: mocks.deleteAnchor }),
}));

const { DreamEdit } = await import('./DreamEdit.tsx');

const dream: Dream = {
  id: 1,
  userId: 1,
  date: '2026-08-01',
  narrative: '<p>I was <span data-anchor-id="7">flying over</span> a city made of glass.</p>',
  createdAt: '2026-08-01T08:00:00.000Z',
  updatedAt: '2026-08-01T08:00:00.000Z',
};

const anchors: AnchorWithAttachments[] = [
  {
    id: 7,
    dreamId: 1,
    createdAt: '2026-08-01T08:05:00.000Z',
    emotionalBeats: [
      {
        id: 40,
        anchorId: 7,
        label: 'dread',
        createdAt: '2026-08-01T08:05:00.000Z',
        updatedAt: '2026-08-01T08:05:00.000Z',
      },
      {
        id: 41,
        anchorId: 7,
        label: 'awe',
        createdAt: '2026-08-01T08:06:00.000Z',
        updatedAt: '2026-08-01T08:06:00.000Z',
      },
    ],
    symbolAttachments: [
      {
        id: 200,
        symbolId: 20,
        anchorId: 7,
        symbolName: 'Ocean',
        createdAt: '2026-08-01T08:07:00.000Z',
        associations: [],
      },
    ],
  },
];

const renderEdit = () => {
  const onSaved = vi.fn();
  render(<DreamEdit dream={dream} anchors={anchors} onSaved={onSaved} />);
  return { onSaved };
};

const save = () => fireEvent.click(screen.getByRole('button', { name: /save narrative/i }));

describe('DreamEdit', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.updateDream.mockResolvedValue(undefined);
    mocks.deleteAnchor.mockResolvedValue(undefined);
  });

  it('saves directly when every anchor is still present in the document', async () => {
    mocks.anchorIdsInDocument.mockReturnValue([7]);
    const { onSaved } = renderEdit();

    save();

    await waitFor(() => {
      expect(mocks.updateDream).toHaveBeenCalledWith(
        expect.objectContaining({ date: '2026-08-01', narrative: dream.narrative }),
      );
    });
    expect(onSaved).toHaveBeenCalled();
    expect(mocks.deleteAnchor).not.toHaveBeenCalled();
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
  });

  it('warns with what would be lost when anchored text was removed, and cancel keeps it', async () => {
    mocks.anchorIdsInDocument.mockReturnValue([]);
    const { onSaved } = renderEdit();

    save();

    const dialog = await screen.findByRole('alertdialog');
    expect(within(dialog).getByText(/delete anchored passages\?/i)).toBeInTheDocument();
    expect(dialog).toHaveTextContent(
      'The text you removed carried 1 anchor with 2 emotional beats and 1 symbol tag. ' +
        'Saving will delete them permanently.',
    );

    fireEvent.click(within(dialog).getByRole('button', { name: /cancel/i }));

    await waitFor(() => {
      expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
    });
    expect(mocks.updateDream).not.toHaveBeenCalled();
    expect(mocks.deleteAnchor).not.toHaveBeenCalled();
    expect(onSaved).not.toHaveBeenCalled();
  });

  it('deletes the missing anchors and then saves when the warning is confirmed', async () => {
    mocks.anchorIdsInDocument.mockReturnValue([]);
    const { onSaved } = renderEdit();

    save();

    const dialog = await screen.findByRole('alertdialog');
    fireEvent.click(within(dialog).getByRole('button', { name: /delete and save/i }));

    await waitFor(() => expect(onSaved).toHaveBeenCalled());
    expect(mocks.deleteAnchor).toHaveBeenCalledWith(7);
    expect(mocks.updateDream).toHaveBeenCalledWith(
      expect.objectContaining({ date: '2026-08-01', narrative: dream.narrative }),
    );
    expect(mocks.deleteAnchor.mock.invocationCallOrder[0]).toBeLessThan(
      mocks.updateDream.mock.invocationCallOrder[0] ?? Infinity,
    );
  });
});
