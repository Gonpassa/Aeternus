# Limit the journal editor toolbar to sanitizer-safe marks

`backend/src/modules/journal/sanitize.ts` allow-lists only `p`, `br`, `strong`, `em`, `h1`-`h3`, `ul`, `ol`, `li` before entry content is saved, and `.entry-content` in `client/src/theme.ts` only styles that same set.
Wiring up toolbar buttons for anything outside it (strike, inline code, code blocks, blockquotes, horizontal rules, H4-H6) would let a user format their entry, then have that formatting silently stripped the next time the entry round-trips through the server - a data-loss bug disguised as a working feature.

We decided to scope the journal editor's toolbar (`EditorMenuBar`) to exactly the sanitizer-safe set - Bold, Italic, Paragraph, H1-H3, Bullet list, Ordered list, plus the state-free actions Clear marks, Clear nodes, Hard break - rather than expanding the sanitizer and CSS to match Tiptap's full StarterKit.
Undo/Redo were dropped separately as unwanted, not as a sanitizer concern.
Richer content types (code blocks, blockquotes) read as closer to the not-yet-built Phase 5 "structured writing" module than journal prose, so we're deferring them rather than expanding journal's content model ahead of that phase.

## Status

Accepted.

## Considered options

Expand `sanitize.ts`'s allow-list and `.entry-content` CSS now to cover the full StarterKit set, and ship every toolbar button from the Tiptap docs example. Rejected: it commits the Journal module to a content model (code blocks, blockquotes, arbitrary heading depth) that overlaps with the still-undesigned Structured Writing module, ahead of that phase actually starting.
