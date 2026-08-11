import { sanitizeEntryContent } from './sanitize';

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
