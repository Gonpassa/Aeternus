import { useCallback, type RefObject } from 'react';
import type { Editor } from '@tiptap/react';
import { ANCHOR_MARK_NAME, anchorMarkRanges } from '../../tiptap/AnchorMark.ts';

export interface UseAnchorRemovalOptions {
  editorRef: RefObject<Editor | null>;
  deleteAnchor: (anchorId: number) => Promise<void>;
  saveNarrative: (narrative: string) => Promise<void>;
  onNarrativeChange: (narrative: string) => void;
}

// Removing a margin note is the inverse of usePendingAttachment's attach, and runs in the
// inverse order: unmark the passage and save the narrative first, delete the Anchor row
// last. The other way round, a failed narrative save would leave an anchor span in the
// stored narrative pointing at a row that no longer exists - the dangling reference ADR-0007
// exists to prevent, and one DreamEdit's anchor diff would then warn about on every later
// edit. This order's failure mode is the recoverable one: an Anchor whose span is already
// gone still renders its note and can simply be removed again.
export function useAnchorRemoval({
  editorRef,
  deleteAnchor,
  saveNarrative,
  onNarrativeChange,
}: UseAnchorRemovalOptions): (anchorId: number) => Promise<void> {
  return useCallback(
    async (anchorId: number) => {
      const editor = editorRef.current;
      const ranges = editor ? anchorMarkRanges(editor, anchorId) : [];
      if (!editor || ranges.length === 0) {
        // Nothing marked in the narrative, so there is nothing to rewrite - saving it here
        // would be a write that changes nothing.
        await deleteAnchor(anchorId);
        return;
      }

      const markedNarrative = editor.getHTML();
      const unmark = editor.chain();
      ranges.forEach((range) => unmark.setTextSelection(range).unsetMark(ANCHOR_MARK_NAME));
      unmark.run();

      const unmarkedNarrative = editor.getHTML();
      onNarrativeChange(unmarkedNarrative);
      try {
        await saveNarrative(unmarkedNarrative);
      } catch (error) {
        // Put the mark back, so the underline the user sees keeps matching what is stored
        // and the note they tried to remove is still theirs to retry.
        const restore = editor.chain();
        ranges.forEach((range) =>
          restore.setTextSelection(range).setMark(ANCHOR_MARK_NAME, { anchorId }),
        );
        restore.run();
        onNarrativeChange(markedNarrative);
        throw error;
      }

      await deleteAnchor(anchorId);
    },
    [editorRef, deleteAnchor, saveNarrative, onNarrativeChange],
  );
}
