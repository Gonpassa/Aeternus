/* eslint-disable -- PROTOTYPE (throwaway, never merges to main): exempt from repo lint standards */
/**
 * PROTOTYPE — throwaway code, never ship.
 * Renders the dream narrative with anchor highlights and reports text
 * selections as paragraph-relative character offsets.
 */
import { useCallback, useRef } from 'react';
import { Box } from '@chakra-ui/react';
import { Text } from '../../../atoms/Text/Text.tsx';
import type { PDreamState } from './prototypeData.ts';

export type PassageSelection = {
  paragraphIndex: number;
  start: number;
  end: number;
  /** Viewport rect of the selection, for positioning a floating toolbar. */
  rect: DOMRect;
};

export interface NarrativeViewProps {
  dream: PDreamState;
  activeAnchorId?: string | null;
  onAnchorClick?: (anchorId: string) => void;
  onPassageSelect?: (selection: PassageSelection) => void;
  /** Visual weight of anchor highlights; 'quiet' underlines only. */
  highlightStyle?: 'wash' | 'quiet';
}

export function NarrativeView({
  dream,
  activeAnchorId = null,
  onAnchorClick,
  onPassageSelect,
  highlightStyle = 'wash',
}: NarrativeViewProps) {
  const rootRef = useRef<HTMLDivElement>(null);

  const handleMouseUp = useCallback(() => {
    if (!onPassageSelect) return;
    const sel = window.getSelection();
    if (!sel || sel.isCollapsed || sel.rangeCount === 0) return;
    const range = sel.getRangeAt(0);
    const startEl =
      range.startContainer instanceof Element
        ? range.startContainer
        : range.startContainer.parentElement;
    const endEl =
      range.endContainer instanceof Element ? range.endContainer : range.endContainer.parentElement;
    const startP = startEl?.closest('[data-paragraph-index]');
    const endP = endEl?.closest('[data-paragraph-index]');
    // Prototype simplification: single-paragraph selections only.
    if (!startP || startP !== endP) return;
    const paragraphIndex = Number(startP.getAttribute('data-paragraph-index'));
    const pre = document.createRange();
    pre.selectNodeContents(startP);
    pre.setEnd(range.startContainer, range.startOffset);
    const start = pre.toString().length;
    const end = start + range.toString().length;
    if (end <= start) return;
    onPassageSelect({
      paragraphIndex,
      start,
      end,
      rect: range.getBoundingClientRect(),
    });
  }, [onPassageSelect]);

  return (
    <Box ref={rootRef} onMouseUp={handleMouseUp}>
      {dream.paragraphs.map((paragraph, paragraphIndex) => {
        const anchors = dream.anchors
          .filter((a) => a.paragraphIndex === paragraphIndex)
          .sort((a, b) => a.start - b.start);
        const segments: Array<{
          text: string;
          anchorId: string | null;
        }> = [];
        let cursor = 0;
        anchors.forEach((a) => {
          if (a.start > cursor)
            segments.push({ text: paragraph.slice(cursor, a.start), anchorId: null });
          segments.push({ text: paragraph.slice(a.start, a.end), anchorId: a.id });
          cursor = a.end;
        });
        if (cursor < paragraph.length)
          segments.push({ text: paragraph.slice(cursor), anchorId: null });

        return (
          <Text
            as="p"
            key={paragraphIndex}
            data-paragraph-index={paragraphIndex}
            textStyle="body"
            mb="5"
          >
            {segments.map((seg, i) =>
              seg.anchorId ? (
                <Box
                  as="mark"
                  key={i}
                  data-anchor-id={seg.anchorId}
                  cursor="pointer"
                  color="ink"
                  bg={
                    highlightStyle === 'wash'
                      ? seg.anchorId === activeAnchorId
                        ? 'moss/25'
                        : 'moss/12'
                      : 'transparent'
                  }
                  borderBottomWidth="2px"
                  borderBottomStyle="solid"
                  borderBottomColor={seg.anchorId === activeAnchorId ? 'rust' : 'moss'}
                  transition="background 150ms ease, border-color 150ms ease"
                  _hover={{ bg: 'moss/25' }}
                  onClick={() => onAnchorClick?.(seg.anchorId!)}
                >
                  {seg.text}
                </Box>
              ) : (
                <span key={i}>{seg.text}</span>
              ),
            )}
          </Text>
        );
      })}
    </Box>
  );
}
