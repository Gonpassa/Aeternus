import sanitizeHtml from 'sanitize-html';
import { ALLOWED_TAGS } from '../../richTextAllowedTags';

export { ALLOWED_TAGS };

// Dream narratives additionally carry the Anchor mark's own tag - a plain <span> embedding
// a stable data-anchor-id (see ADR-0007) - which journal's sanitizer doesn't need to allow,
// since only Dream narratives can have Anchors. Kept in sync with the client's AnchorMark
// Tiptap extension (client/src/modules/dreams/tiptap/AnchorMark.ts) via sanitize.test.ts's
// contract test, the same hand-maintained-mirror approach ADR-0003 already uses for
// ALLOWED_TAGS above.
export const DREAM_ALLOWED_TAGS = [...ALLOWED_TAGS, 'span'];
export const ANCHOR_MARK_ATTRIBUTE = 'data-anchor-id';

// A bare <span> (e.g. from pasted Word/Google Docs content) carries no anchor semantics and
// must not survive as a no-op wrapper - only a span actually carrying data-anchor-id is the
// Anchor mark's tag. transformTags renames any span missing that attribute to a tag name
// outside DREAM_ALLOWED_TAGS, so sanitize-html discards the wrapper while keeping its text
// (the same behavior a disallowed tag always gets), rather than special-casing it as allowed.
const UNWRAPPED_SPAN_TAG = 'span-without-anchor-id';

export const sanitizeDreamNarrative = (html: string): string =>
  sanitizeHtml(html, {
    allowedTags: DREAM_ALLOWED_TAGS,
    allowedAttributes: { span: [ANCHOR_MARK_ATTRIBUTE] },
    transformTags: {
      span: (tagName, attribs): sanitizeHtml.Tag => {
        const anchorId = attribs[ANCHOR_MARK_ATTRIBUTE];
        if (typeof anchorId !== 'string') return { tagName: UNWRAPPED_SPAN_TAG, attribs: {} };
        return { tagName, attribs: { [ANCHOR_MARK_ATTRIBUTE]: anchorId } };
      },
    },
  });
