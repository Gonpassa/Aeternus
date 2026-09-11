import { type MouseEvent as ReactMouseEvent, type MutableRefObject, type RefObject } from 'react';
import type { Editor } from '@tiptap/react';
import { AnchorMark } from '../../../tiptap/AnchorMark.ts';
import { RichTextEditor } from '../../../../../atoms/RichTextEditor/RichTextEditor.tsx';
import { Stack } from '../../../../../atoms/Stack/Stack.tsx';

// Stable reference - useEditor re-initializes the editor whenever the extensions array
// identity changes, so this must not be recreated on every render.
const ANCHOR_EXTENSIONS = [AnchorMark];

export interface ManuscriptProps {
  narrative: string;
  onNarrativeChange: (narrative: string) => void;
  // The Tiptap instance, needed by the page for selection mapping and marking passages.
  editorRef: RefObject<Editor | null>;
  // The wrapper element, so the page can tell selections inside the manuscript apart
  // from selections anywhere else.
  containerRef: MutableRefObject<HTMLDivElement | null>;
  activeAnchorId: number | null;
  onAnchorClick: (anchorId: number) => void;
}

// The read-only narrative: the dream as written, with each anchored passage underlined -
// a dotted ink-blue hairline at rest, a solid rust rule while it is the active Anchor.
export function Manuscript({
  narrative,
  onNarrativeChange,
  editorRef,
  containerRef,
  activeAnchorId,
  onAnchorClick,
}: ManuscriptProps) {
  const handleClick = (event: ReactMouseEvent<HTMLDivElement>) => {
    const target = event.target as HTMLElement;
    const span = target.closest('span[data-anchor-id]');
    const anchorId = span ? Number(span.getAttribute('data-anchor-id')) : NaN;
    if (!Number.isInteger(anchorId)) return;
    onAnchorClick(anchorId);
  };

  return (
    /* eslint-disable-next-line jsx-a11y/no-static-element-interactions, jsx-a11y/click-events-have-key-events --
       clicking an anchored span is a pointer-only enhancement; the margin note's
       excerpt button is the keyboard-reachable way to activate the same anchor. */
    <Stack
      ref={containerRef}
      direction="column"
      align="stretch"
      flex="1"
      maxW="42rem"
      alignSelf={{ base: 'stretch', lg: 'auto' }}
      position="relative"
      onClick={handleClick}
      css={{
        '& span[data-anchor-id]': {
          borderBottomWidth: '1px',
          borderBottomStyle: 'dotted',
          borderBottomColor: 'inkBlue',
          cursor: 'pointer',
        },
        ...(activeAnchorId !== null
          ? {
              [`& span[data-anchor-id="${activeAnchorId}"]`]: {
                borderBottomWidth: '2px',
                borderBottomStyle: 'solid',
                borderBottomColor: 'rust',
              },
            }
          : {}),
      }}
    >
      <RichTextEditor
        ref={editorRef}
        readOnly
        value={narrative}
        onChange={onNarrativeChange}
        extraExtensions={ANCHOR_EXTENSIONS}
      />
    </Stack>
  );
}
