import sanitizeHtml from 'sanitize-html';
import { ALLOWED_TAGS } from '../../richTextAllowedTags';

export { ALLOWED_TAGS };

export const sanitizeDreamNarrative = (html: string): string =>
  sanitizeHtml(html, {
    allowedTags: ALLOWED_TAGS,
    allowedAttributes: {},
  });
