# Store Dream Anchors as an embedded Tiptap mark, not as character offsets

A Dream's **Anchor** (`CONTEXT.md`) marks a highlighted range within its rich-text narrative, and is the shared attachment point for Emotional beats, Symbol tags, and per-element Analytic analysis.
The narrative is stored the same way Journal's Entry content is: an HTML string produced by a Tiptap editor.
Anchoring a range within that HTML needs a way to identify the same range again on every later render, including after the surrounding narrative has been edited.

The simpler option looked like storing `startOffset`/`endOffset` against the narrative's plain text in the `anchors` row.
It falls apart under edits: inserting or deleting a single character anywhere before an anchored range shifts every offset after it out of sync with no signal that it happened, silently misattaching a Symbol tag or Emotional beat to the wrong words the next time the Dream is opened. Since a Dream's whole premise is that the narrative and its analysis are revisited over separate sessions as understanding deepens, an anchoring scheme that degrades on the very next edit is a poor fit.

We instead give Anchors their own Tiptap Mark extension. The mark embeds a stable `data-anchor-id` (the Anchor row's own id) directly in the narrative's HTML, the same way the existing `bold`/`italic`/heading marks are embedded by `StarterKit`. The `anchors` table row is keyed by that id, not by position, so it travels with the marked text through arbitrary edits elsewhere in the document. It only breaks if the marked span itself is deleted - the one case where breaking is actually correct (see the Anchor deletion-on-text-removal rule in `CONTEXT.md`).

This has two implementation consequences carried forward into later work: `backend/src/modules/journal/sanitize.ts`'s allow-list (ADR-0003) needs a Dream-specific equivalent that permits the anchor mark's `data-anchor-id` attribute, and the client needs a small amount of logic to detect, on save, which previously-known anchor ids are no longer present in the document (to drive the cascade-delete-with-warning behavior) rather than trusting the DB rows alone.
