import { useCallback, useState, type RefObject } from 'react';
import type { Editor } from '@tiptap/react';
import type { Anchor } from '@nee3/shared-types';
import { ANCHOR_MARK_NAME } from '../../tiptap/AnchorMark.ts';
import { collapseDomSelection, type SelectionRange } from './useManuscriptSelection.ts';

export interface UsePendingAttachmentOptions {
  editorRef: RefObject<Editor | null>;
  createAnchor: () => Promise<Anchor>;
  deleteAnchor: (anchorId: number) => Promise<void>;
  saveNarrative: (narrative: string) => Promise<void>;
  onNarrativeChange: (narrative: string) => void;
  // Retiring the pending selection has to retire whatever else the page parked against
  // it - the composer's '(selected passage)' option.
  onPendingRetired: () => void;
  onAnchorCreated: (anchorId: number) => void;
}

export interface PendingAttachment {
  // The selected text, shown wherever the parked selection is offered; null when there
  // is no pending selection.
  excerpt: string | null;
  park: (range: SelectionRange, excerpt: string) => void;
  clear: () => void;
  attach: (attachment: (anchorId: number) => Promise<unknown>) => Promise<void>;
}

// A selection handed off to a dialog or the pass composer before its Anchor exists - the
// Anchor is only created when the attachment that justifies it is submitted, because an
// Anchor must never persist without one (see CONTEXT.md's Anchor definition).
export function usePendingAttachment({
  editorRef,
  createAnchor,
  deleteAnchor,
  saveNarrative,
  onNarrativeChange,
  onPendingRetired,
  onAnchorCreated,
}: UsePendingAttachmentOptions): PendingAttachment {
  const [range, setRange] = useState<SelectionRange | null>(null);
  const [excerpt, setExcerpt] = useState<string | null>(null);

  const park = useCallback((pendingRange: SelectionRange, pendingExcerpt: string) => {
    setRange(pendingRange);
    setExcerpt(pendingExcerpt);
  }, []);

  // Fully abandons a parked pending selection: cancelling its dialog (or completing the
  // flow) must also retire the composer's '(selected passage)' option, or a stale
  // anchorSelection of 'pending' would point at a range the user believed was discarded.
  const clear = useCallback(() => {
    setRange(null);
    setExcerpt(null);
    onPendingRetired();
    collapseDomSelection();
  }, [onPendingRetired]);

  // Creates the Anchor for the pending selection, runs the attachment, then marks the
  // passage and persists the marked narrative - in that order, so the narrative save is
  // the last step and no failure can leave an anchor span in the stored narrative
  // pointing at a rolled-back Anchor row. Rollback deletes the Anchor (cascading the
  // just-created attachment) before rethrowing so the calling form stays open for retry.
  const attach = async (attachment: (anchorId: number) => Promise<unknown>) => {
    if (!range) {
      // The pending selection was consumed by another flow; reject rather than resolve so
      // the caller keeps its input instead of treating this as a successful save.
      throw new Error('The selected passage is no longer available - select it again.');
    }
    const anchor = await createAnchor();
    try {
      await attachment(anchor.id);
    } catch (error) {
      await deleteAnchor(anchor.id).catch(() => {});
      throw error;
    }
    const editor = editorRef.current;
    if (editor) {
      editor
        .chain()
        .setTextSelection(range)
        .setMark(ANCHOR_MARK_NAME, { anchorId: anchor.id })
        .run();
      const markedNarrative = editor.getHTML();
      onNarrativeChange(markedNarrative);
      try {
        await saveNarrative(markedNarrative);
      } catch (error) {
        editor.chain().setTextSelection(range).unsetMark(ANCHOR_MARK_NAME).run();
        onNarrativeChange(editor.getHTML());
        await deleteAnchor(anchor.id).catch(() => {});
        throw error;
      }
    }
    clear();
    onAnchorCreated(anchor.id);
  };

  return { excerpt, park, clear, attach };
}
