export const stripHtml = (html: string): string =>
  html
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

// The one truncation rule for summarised rich text: strip HTML, cut at a word
// boundary within maxLength, and append an ellipsis only when something was cut.
export const excerpt = (html: string, maxLength: number): string => {
  const text = stripHtml(html);
  if (text.length <= maxLength) return text;
  const overshoot = text.slice(0, maxLength + 1);
  const lastBoundary = overshoot.lastIndexOf(' ');
  const cut = lastBoundary > 0 ? overshoot.slice(0, lastBoundary) : text.slice(0, maxLength);
  return `${cut}…`;
};
