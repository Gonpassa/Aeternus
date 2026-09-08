import { sanitizeDreamNarrative, ALLOWED_TAGS } from './sanitize';

// Mirrors the tags client/src/atoms/RichTextEditor/RichTextEditor.tsx's Tiptap StarterKit
// configuration actually produces - see journal's sanitize.test.ts for the full rationale
// (the same editor component is shared between journal and dreams).
const EDITOR_ENABLED_TAGS = ['p', 'br', 'strong', 'em', 'h1', 'h2', 'h3', 'ul', 'ol', 'li'];

describe('sanitizer/editor mark-set contract (ADR-0003)', () => {
  it('allows exactly the tags the shared rich-text editor toolbar can produce', () => {
    expect([...ALLOWED_TAGS].sort()).toEqual([...EDITOR_ENABLED_TAGS].sort());
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
