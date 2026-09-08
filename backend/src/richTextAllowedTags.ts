// Shared allow-list for HTML sanitization of any rich-text field saved through the client's
// RichTextEditor (client/src/atoms/RichTextEditor) - kept in sync with its StarterKit config
// per ADR-0003's approach. Used by both journal's and dreams' sanitize.ts, since both modules'
// rich-text fields go through the same editor.
export const ALLOWED_TAGS = ['p', 'br', 'strong', 'em', 'h1', 'h2', 'h3', 'ul', 'ol', 'li'];
