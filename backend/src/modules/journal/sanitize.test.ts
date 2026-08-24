import { sanitizeEntryContent, ALLOWED_TAGS } from './sanitize';

// Mirrors the tags client/src/modules/journal/components/RichTextEditor/RichTextEditor.tsx's
// Tiptap StarterKit configuration actually produces: StarterKit's defaults (paragraph,
// bold -> strong, italic -> em, bulletList, orderedList, listItem, hardBreak -> br) plus
// heading restricted to levels 1-3, with strike/code/codeBlock/blockquote/horizontalRule
// explicitly disabled - see ADR-0003. There's no runtime import across the client/backend
// boundary (packages/shared-types ships types only, per ADR-0001), so this list is a
// hand-maintained mirror: if RichTextEditor's enabled marks ever change, update this list
// and confirm ALLOWED_TAGS above still covers it, or vice versa.
const EDITOR_ENABLED_TAGS = ['p', 'br', 'strong', 'em', 'h1', 'h2', 'h3', 'ul', 'ol', 'li'];

describe('sanitizer/editor mark-set contract (ADR-0003)', () => {
  it('allows exactly the tags the journal editor toolbar can produce', () => {
    expect([...ALLOWED_TAGS].sort()).toEqual([...EDITOR_ENABLED_TAGS].sort());
  });
});

describe('sanitizeEntryContent', () => {
  it('keeps allow-listed formatting tags', () => {
    const html = '<p>Hello <strong>world</strong> <em>today</em></p><ul><li>one</li></ul>';
    expect(sanitizeEntryContent(html)).toBe(html);
  });

  it('strips script tags and their contents', () => {
    expect(sanitizeEntryContent('<p>Hi</p><script>alert(1)</script>')).toBe('<p>Hi</p>');
  });

  it('strips event-handler attributes', () => {
    expect(sanitizeEntryContent('<p onclick="alert(1)">Hi</p>')).toBe('<p>Hi</p>');
  });

  it('strips disallowed tags but keeps their text content', () => {
    expect(sanitizeEntryContent('<div>Hi</div>')).toBe('Hi');
  });
});
