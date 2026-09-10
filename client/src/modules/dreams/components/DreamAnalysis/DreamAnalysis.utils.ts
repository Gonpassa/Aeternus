export interface NarrativeAnchors {
  // The text carried by each Anchor's mark span(s), keyed by anchor id.
  excerpts: Record<number, string>;
  // Anchor ids in the order their marks appear in the narrative, each listed once at its
  // first appearance.
  documentOrder: number[];
}

// Everything the page needs to know about the Anchors in a narrative, read straight from
// the stored HTML (see ADR-0007: the mark renders as `<span data-anchor-id>`), so it needs
// no live editor instance - margin notes and analysis passes label themselves with the
// excerpts, and the margin column orders itself by documentOrder.
//
// Both come out of a single parse because they answer the same question about the same
// spans: which anchors are in this narrative, and where. Document order is the spans'
// position in the HTML, never their rendered position - see ADR-0008; nothing here
// touches layout.
export const parseNarrativeAnchors = (narrativeHtml: string): NarrativeAnchors => {
  const doc = new DOMParser().parseFromString(narrativeHtml, 'text/html');
  const excerpts: Record<number, string> = {};
  const documentOrder: number[] = [];
  doc.querySelectorAll('span[data-anchor-id]').forEach((span) => {
    const id = Number(span.getAttribute('data-anchor-id'));
    if (!Number.isInteger(id)) return;
    if (!(id in excerpts)) documentOrder.push(id);
    excerpts[id] = `${excerpts[id] ?? ''}${span.textContent ?? ''}`;
  });
  return { excerpts, documentOrder };
};

// Orders Anchors the way a reader meets them in the manuscript. The `anchors` array
// arrives from the API in creation order, so without this the closing paragraph's margin
// note sorts first whenever it was anchored first. Anchors whose mark is absent from the
// narrative (nothing should produce one, but a failed narrative save could) sort last,
// keeping the order they were given.
export const anchorsInDocumentOrder = <T extends { id: number }>(
  anchors: T[],
  documentOrder: number[],
): T[] => {
  const rank = new Map(documentOrder.map((id, index) => [id, index]));
  const rankOf = (anchor: T) => rank.get(anchor.id) ?? documentOrder.length;
  return [...anchors].sort((a, b) => rankOf(a) - rankOf(b));
};

// Excerpts appear in tight contexts (margin notes, the anchor picker, pass stamps) -
// clip them on a length budget with an ellipsis rather than letting them wrap.
export const truncateExcerpt = (excerpt: string, maxLength = 40): string =>
  excerpt.length > maxLength ? `${excerpt.slice(0, maxLength).trimEnd()}…` : excerpt;
