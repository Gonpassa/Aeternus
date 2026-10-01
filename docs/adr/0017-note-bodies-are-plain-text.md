# Note bodies are plain text, in a module where every other long field is rich text

Journal entries and dream narratives are written in the Tiptap-based `RichTextEditor`, stored as sanitized HTML, and styled per-module in `client/src/theme.ts`.
We decided the Notes module uses none of that.
A Literature note's body, a Permanent note's body, and the verbatim excerpt are plain text in a Textarea, stored as `text`, rendered as written.

The rule the plain body enforces is the module's central constraint, not a styling preference.
A Permanent note holds exactly one idea, titled as a single-sentence claim; the research findings put it as "if the title needs an 'and', it is two notes".
A body that wants headings, or a bulleted list, is a body holding more than one idea, and the honest response to that pressure is to split the note rather than to format it.
Giving the field the means to express structure would let the user relieve that pressure in the one way the method says they should not, and the editor would be doing it helpfully.
Literature notes follow for the simpler reason that a few sentences on one point, written closed-book, have no structure to express.

Three downstream consumers want one text shape, and all three arrive later.
Search over notes (#72) matches a Permanent note's title and body and a Literature note's body, Source title and Locator; against HTML it would either match markup or need a strip step maintained in parallel with the sanitizer's allow-list.
Phase 8 citations quote a note inside a piece of structured writing, where the note's own formatting would arrive as a nested document rather than as a quotation.
The Phase 10 quiz generates questions from note text, and markup in the prompt is noise it has to be taught to ignore.

The excerpt is plain text for a different reason, and it is the one place where the two text fields must not be confused.
It holds the author's exact words, stored in its own column precisely so they are never mixed into the user's; a shared editor would make the two look alike at the moment the whole point is that they are not.

This also keeps the module clear of ADR 0003's failure mode by construction.
That ADR scoped the journal toolbar to the sanitizer's allow-list because formatting a user can apply and the server then strips is a data-loss bug wearing a feature's clothes.
A plain-text field has no allow-list to drift from, no sanitizer to keep in step, and no per-module `.entry-content` styling to maintain.

The precedent inside the codebase is the dream module, where the split already exists: the Record side gets the editor because a dream narrative is prose recalled at length, and the analysis side does not.
Notes is the Analysis side all the way down.

## Status

Accepted.

## Considered options

**`RichTextEditor` with a reduced toolbar, following ADR 0003.**
Rejected.
It is the consistent-looking option and it is consistent with the wrong thing: the reason for the journal's reduced toolbar is sanitizer safety, while the reason here is that structure in the body means the note should have been split.
A reduced toolbar still offers the lists and headings that would be used to avoid splitting, and reducing it until it offers none leaves an editor with no buttons.

**Markdown in a plain column, rendered on display.**
Rejected.
It gets plain storage, search and citations right, and gives back exactly the structure the decision is trying to deny - a user who wants two sections writes two `##` headings and the note stays one note.
It also introduces a rendering pipeline and an XSS surface to serve formatting nobody should be using.

**Plain text for Literature notes, rich text for Permanent notes.**
Rejected, and it was the tempting split, since a Permanent note is the more considered piece of writing.
It is backwards: the Literature note is a quick capture where formatting would be harmless, and the Permanent note is the one whose single-idea constraint the plain field protects.
It would also give the module two text shapes for search, citation and the quiz to handle, for no gain.

**Plain text now, rich text later if it is missed.**
Rejected as the framing, accepted as the migration path.
Plain text to HTML is a one-way migration that is easy to run and hard to reverse, so nothing here is permanent; what is rejected is treating the plain field as a temporary simplification, since it is the constraint.

## Consequences

Notes capture uses the `Textarea` atom, not `RichTextEditor`, and the module adds no `sanitize.ts` HTML allow-list of its own - its `sanitize.ts` trims and normalizes text rather than filtering markup.
There is no `.notes-content` block in `client/src/theme.ts`, and no contract test of the kind ADR 0003 needed, because there is no editor/sanitizer correspondence to keep.

Line breaks typed by the user are preserved on display, which is the one piece of structure a plain field does carry and the only one the method has no objection to.

The field's guidance copy does the work a toolbar's absence might otherwise raise questions about: "a few sentences on one point, written closed-book" on the Literature note body, and the single-claim title doing it for the Permanent note.
There is no character counter and no nudge; the real check is downstream, when a bloated note fails to yield a single-idea Permanent note.

Max lengths are validation, not column types - the columns stay `text` - so the message can be written in the module's voice: 4,000 characters for a Literature note body and excerpt, 8,000 for a Permanent note body, 280 for a Permanent note title.
