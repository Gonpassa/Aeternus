import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type MutableRefObject,
  type RefObject,
} from 'react';
import type { Editor } from '@tiptap/react';
import { anchorIdsInRange } from '../../tiptap/AnchorMark.ts';

// A ProseMirror position range - what the toolbar's actions carry forward, since DOM
// ranges don't survive the narrative being re-rendered.
export interface SelectionRange {
  from: number;
  to: number;
}

export interface ManuscriptSelection {
  // Attach to the element wrapping the editor: selections outside it are ignored.
  manuscriptRef: MutableRefObject<HTMLDivElement | null>;
  // Viewport rect of the live selection, for positioning the toolbar; null when there
  // is nothing selected inside the manuscript.
  rect: DOMRect | null;
  range: SelectionRange | null;
  // The Anchor the selection overlaps, if any - such a selection reuses that Anchor
  // rather than creating a second one over the same passage.
  overlappingAnchorId: number | null;
  clear: () => void;
}

// Retires the visual text selection by collapsing it rather than removeAllRanges():
// an emptied selection never reaches ProseMirror's selectionchange handler, which
// leaves its DOM-selection cache stale - an identical re-selection of the same passage
// would then compare equal to the cache and be silently ignored (dead toolbar). A
// collapse is observed, resyncing both the cache and the editor state selection.
export function collapseDomSelection() {
  const domSelection = window.getSelection();
  if (domSelection && domSelection.rangeCount > 0) domSelection.collapseToEnd();
}

// Tracks what the reader has selected in the manuscript, in the terms the attachment
// flows need: a rect to hang the toolbar on, a ProseMirror range, and whether that range
// already sits on an Anchor.
export function useManuscriptSelection(editorRef: RefObject<Editor | null>): ManuscriptSelection {
  const manuscriptRef = useRef<HTMLDivElement | null>(null);
  const [rect, setRect] = useState<DOMRect | null>(null);
  const [range, setRange] = useState<SelectionRange | null>(null);
  const [overlappingAnchorId, setOverlappingAnchorId] = useState<number | null>(null);

  const clear = useCallback(() => {
    setRect(null);
    setRange(null);
    setOverlappingAnchorId(null);
  }, []);

  // The toolbar tracks the document's native selectionchange event rather than Tiptap's
  // selectionUpdate: ProseMirror keeps a cache of the last DOM selection it observed and
  // silently ignores any new selection that compares equal to it - which happens whenever
  // focus leaves the editor mid-flow (a dialog's focus trap parks the caret in its input)
  // and the user then re-selects the same passage. The native event fires for every user
  // selection unconditionally; PM positions are recovered from the DOM range via posAtDOM.
  useEffect(() => {
    const handleSelectionChange = () => {
      const editor = editorRef.current;
      const manuscript = manuscriptRef.current;
      if (!editor || !manuscript) return;
      const domSelection = window.getSelection();
      const domRange =
        domSelection && domSelection.rangeCount > 0 && !domSelection.isCollapsed
          ? domSelection.getRangeAt(0)
          : null;
      if (!domRange || !manuscript.contains(domRange.commonAncestorContainer)) {
        clear();
        return;
      }
      try {
        const from = editor.view.posAtDOM(domRange.startContainer, domRange.startOffset);
        const to = editor.view.posAtDOM(domRange.endContainer, domRange.endOffset);
        if (from < 0 || to < 0 || from === to) {
          clear();
          return;
        }
        setRect(domRange.getBoundingClientRect());
        setRange({ from, to });
        setOverlappingAnchorId(anchorIdsInRange(editor, from, to)[0] ?? null);
      } catch {
        // posAtDOM throws for DOM nodes it cannot map into the document.
        clear();
      }
    };
    document.addEventListener('selectionchange', handleSelectionChange);
    return () => document.removeEventListener('selectionchange', handleSelectionChange);
  }, [editorRef, clear]);

  // The toolbar's caller-owned dismissal: Escape clears the selection state (outside
  // clicks collapse the selection, which clears it via handleSelectionChange).
  useEffect(() => {
    if (!rect) return undefined;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      clear();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [rect, clear]);

  return { manuscriptRef, rect, range, overlappingAnchorId, clear };
}
