import { useCallback, useLayoutEffect, useRef, useState, type RefObject } from 'react';

// Vertical gap kept between stacked margin notes, and the height assumed for a note that
// has not been measured yet (first paint, before its ref registers).
const NOTE_GAP = 12;
const FALLBACK_NOTE_HEIGHT = 120;

export interface UseMarginNoteLayoutOptions {
  manuscriptRef: RefObject<HTMLDivElement | null>;
  anchorIds: number[];
  // The margin column only exists on wide viewports; disabled, the hook returns no tops
  // (the stacked fallback lays notes out in normal flow).
  enabled: boolean;
  // Anything that can move anchors or resize notes (narrative, attachments, open forms);
  // a new identity re-measures.
  layoutKey: unknown;
}

export interface MarginNoteLayout {
  tops: Record<number, number>;
  registerNote: (anchorId: number, element: HTMLDivElement | null) => void;
}

// Google-Docs-comments layout for the margin column: each note aligns with its anchor's
// rendered position in the manuscript, then gets pushed down just enough that notes never
// overlap. Re-measures once webfonts finish loading, since Fraunces/Newsreader metrics
// shift every anchor's position.
export function useMarginNoteLayout({
  manuscriptRef,
  anchorIds,
  enabled,
  layoutKey,
}: UseMarginNoteLayoutOptions): MarginNoteLayout {
  const noteElements = useRef(new Map<number, HTMLDivElement>());
  const [tops, setTops] = useState<Record<number, number>>({});
  const [fontsTick, setFontsTick] = useState(0);

  useLayoutEffect(() => {
    document.fonts?.ready.then(() => setFontsTick((tick) => tick + 1));
  }, []);

  useLayoutEffect(() => {
    if (!enabled) {
      setTops({});
      return;
    }
    const root = manuscriptRef.current;
    if (!root) return;
    const rootTop = root.getBoundingClientRect().top;
    const next: Record<number, number> = {};
    let floor = 0;
    anchorIds
      .map((id) => {
        const span = root.querySelector(`span[data-anchor-id="${id}"]`);
        return { id, top: span ? span.getBoundingClientRect().top - rootTop : 0 };
      })
      .sort((a, b) => a.top - b.top)
      .forEach(({ id, top }) => {
        const noteElement = noteElements.current.get(id);
        const height = noteElement ? noteElement.offsetHeight : FALLBACK_NOTE_HEIGHT;
        const placed = Math.max(top, floor);
        next[id] = placed;
        floor = placed + height + NOTE_GAP;
      });
    setTops(next);
  }, [enabled, manuscriptRef, anchorIds, layoutKey, fontsTick]);

  const registerNote = useCallback((anchorId: number, element: HTMLDivElement | null) => {
    if (element) {
      noteElements.current.set(anchorId, element);
    } else {
      noteElements.current.delete(anchorId);
    }
  }, []);

  return { tops, registerNote };
}
