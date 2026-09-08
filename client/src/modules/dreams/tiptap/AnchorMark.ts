import { Mark, mergeAttributes, type Editor } from '@tiptap/react';

// Embeds a Dream's Anchor row id directly in the narrative HTML as a plain <span>'s
// data-anchor-id attribute (see ADR-0007) rather than storing character offsets, so the
// anchor travels with its marked text through arbitrary edits elsewhere in the document.
// Kept in sync with backend/src/modules/dreams/sanitize.ts's allow-list via that module's
// sanitize.test.ts contract test.
export const ANCHOR_MARK_NAME = 'anchor';
export const ANCHOR_MARK_ATTRIBUTE = 'data-anchor-id';

export interface AnchorMarkAttributes {
  anchorId: number;
}

export const AnchorMark = Mark.create({
  name: ANCHOR_MARK_NAME,

  addAttributes() {
    return {
      anchorId: {
        default: null,
        parseHTML: (element) => {
          const raw = element.getAttribute(ANCHOR_MARK_ATTRIBUTE);
          return raw ? Number(raw) : null;
        },
        renderHTML: (attributes) => ({ [ANCHOR_MARK_ATTRIBUTE]: attributes.anchorId }),
      },
    };
  },

  parseHTML() {
    return [{ tag: `span[${ANCHOR_MARK_ATTRIBUTE}]` }];
  },

  renderHTML({ HTMLAttributes }) {
    return ['span', mergeAttributes(HTMLAttributes), 0];
  },
});

// Anchor ids carried by any mark touching the given range - used both for overlap
// detection (does this selection touch an existing Anchor?) and, with the range covering
// the whole document, for the on-save diff against previously-known anchor ids.
export const anchorIdsInRange = (editor: Editor, from: number, to: number): number[] => {
  const ids = new Set<number>();
  editor.state.doc.nodesBetween(from, to, (node) => {
    node.marks.forEach((mark) => {
      if (mark.type.name === ANCHOR_MARK_NAME && typeof mark.attrs.anchorId === 'number') {
        ids.add(mark.attrs.anchorId);
      }
    });
  });
  return [...ids];
};

export const anchorIdsInDocument = (editor: Editor): number[] =>
  anchorIdsInRange(editor, 0, editor.state.doc.content.size);
