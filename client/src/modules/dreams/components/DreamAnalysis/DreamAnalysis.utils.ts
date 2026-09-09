// The text carried by each Anchor's mark span(s) in the narrative HTML, keyed by anchor
// id. Parsed straight from the stored HTML (see ADR-0007: the mark renders as
// `<span data-anchor-id>`), so it needs no live editor instance - margin notes and
// analysis passes label themselves with these excerpts.
export const anchorExcerpts = (narrativeHtml: string): Record<number, string> => {
  const doc = new DOMParser().parseFromString(narrativeHtml, 'text/html');
  const excerpts: Record<number, string> = {};
  doc.querySelectorAll('span[data-anchor-id]').forEach((span) => {
    const id = Number(span.getAttribute('data-anchor-id'));
    if (!Number.isInteger(id)) return;
    excerpts[id] = `${excerpts[id] ?? ''}${span.textContent ?? ''}`;
  });
  return excerpts;
};

// Excerpts appear in tight contexts (margin notes, the anchor picker, pass stamps) -
// clip them on a length budget with an ellipsis rather than letting them wrap.
export const truncateExcerpt = (excerpt: string, maxLength = 40): string =>
  excerpt.length > maxLength ? `${excerpt.slice(0, maxLength).trimEnd()}…` : excerpt;
