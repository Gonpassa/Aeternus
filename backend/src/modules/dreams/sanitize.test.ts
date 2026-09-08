import {
  sanitizeDreamNarrative,
  ALLOWED_TAGS,
  DREAM_ALLOWED_TAGS,
  ANCHOR_MARK_ATTRIBUTE,
} from './sanitize';

// Mirrors the tags client/src/atoms/RichTextEditor/RichTextEditor.tsx's Tiptap StarterKit
// configuration actually produces - see journal's sanitize.test.ts for the full rationale
// (the same editor component is shared between journal and dreams).
const EDITOR_ENABLED_TAGS = ['p', 'br', 'strong', 'em', 'h1', 'h2', 'h3', 'ul', 'ol', 'li'];

// Mirrors the tag and attribute client/src/modules/dreams/tiptap/AnchorMark.ts's Tiptap
// Mark extension actually produces (see ADR-0007).
const ANCHOR_MARK_TAG = 'span';
const ANCHOR_MARK_HTML_ATTRIBUTE = 'data-anchor-id';

describe('sanitizer/editor mark-set contract (ADR-0003)', () => {
  it('allows exactly the tags the shared rich-text editor toolbar can produce', () => {
    expect([...ALLOWED_TAGS].sort()).toEqual([...EDITOR_ENABLED_TAGS].sort());
  });
});

describe('sanitizer/Anchor mark contract (ADR-0007)', () => {
  it('allows exactly the tag and attribute the AnchorMark Tiptap extension produces', () => {
    expect([...DREAM_ALLOWED_TAGS].sort()).toEqual([...ALLOWED_TAGS, ANCHOR_MARK_TAG].sort());
    expect(ANCHOR_MARK_ATTRIBUTE).toBe(ANCHOR_MARK_HTML_ATTRIBUTE);
  });

  it('keeps an anchor span and its data-anchor-id intact', () => {
    const html = '<p>I was <span data-anchor-id="1">flying over a city</span> made of glass.</p>';
    expect(sanitizeDreamNarrative(html)).toBe(html);
  });

  it('strips attributes on an anchor span other than data-anchor-id', () => {
    const html = '<p><span data-anchor-id="1" onclick="alert(1)" style="color:red">hi</span></p>';
    expect(sanitizeDreamNarrative(html)).toBe('<p><span data-anchor-id="1">hi</span></p>');
  });

  it('strips a bare span (no data-anchor-id) but keeps its text content', () => {
    const html = '<p><span style="color:red">pasted</span> text</p>';
    expect(sanitizeDreamNarrative(html)).toBe('<p>pasted text</p>');
  });
});

describe('sanitizeDreamNarrative', () => {
  it('keeps allow-listed formatting tags', () => {
    const html = '<p>Hello <strong>world</strong> <em>today</em></p><ul><li>one</li></ul>';
    expect(sanitizeDreamNarrative(html)).toBe(html);
  });

  it('strips script tags and their contents', () => {
    expect(sanitizeDreamNarrative('<p>Hi</p><script>alert(1)</script>')).toBe('<p>Hi</p>');
  });

  it('strips event-handler attributes', () => {
    expect(sanitizeDreamNarrative('<p onclick="alert(1)">Hi</p>')).toBe('<p>Hi</p>');
  });

  it('strips disallowed tags but keeps their text content', () => {
    expect(sanitizeDreamNarrative('<div>Hi</div>')).toBe('Hi');
  });
});
