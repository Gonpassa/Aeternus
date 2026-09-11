# Render Dream margin notes in document order, not aligned to their anchored passage

The Analysis page's Marginalia design (#50) puts each **Anchor**'s attachments in a margin column beside the manuscript.
The spec called for each note to sit vertically aligned with its anchored passage, the way a scholar's annotation sits level with the line it comments on.

That alignment was built as `useMarginNoteLayout`, and it cost more than it looked like it would.
Aligning a note requires measuring where its `span[data-anchor-id]` actually rendered, which means `getBoundingClientRect` against live DOM after layout.
Two notes whose passages sit close together then overlap, so the hook also had to push each note down past the previous one's measured height, with an assumed fallback height for notes not yet measured on first paint.
The measurements go stale on anything that moves an anchor or resizes a note: the narrative changing, an attachment being added, an inline form opening, and webfonts finishing load, since Fraunces and Newsreader metrics shift every anchor's position.
Because absolutely-positioned notes contribute no flow height, the column also had to reserve a measured minimum height or a tall stack would overflow onto the Analysis section below.
And none of it applies on narrow viewports, so the component carried a JavaScript media query and branched its entire layout on the result.

We are dropping alignment.
Margin notes render in normal flow, ordered by where their anchored passage appears in the narrative: whichever passage is marked first in the text gets the first note.

The ordering is derived from the position of each `span[data-anchor-id]` in the narrative HTML, not from the order the `anchors` array arrives from the API, which is creation order.
Anchoring the closing paragraph before the opening one would otherwise sort its note first.
This is a string-index sort computed during the existing `anchorExcerpts` parse, so it costs one pass over HTML the component already parses and never touches layout.

What is lost is the precise spatial link between a note and its passage on wide viewports.
Clicking an anchored span still activates it and paints it rust, and the newly-active note scrolls into view, which is what the alignment was really providing once the passage and its note were more than a screen apart anyway.
What is gained is that the two-column layout becomes pure CSS: manuscript beside margin at `lg` and up, notes stacked underneath below that, expressed as Chakra responsive style props.
`useMediaQuery` leaves the component entirely, mobile stops being a separate code path, and eighty-five lines of measurement disappear.

This reverses one line of the #50 spec ("each Anchor's note is absolutely positioned to align with its mark's rendered vertical offset, pushed down to avoid overlapping the previous note, re-measured after webfonts load").
The margin column itself, the quiet underline-only anchor highlights, and the specimen-label symbol treatment all stand as specced.
