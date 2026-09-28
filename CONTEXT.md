# Aeternus

Personal hub application (journaling, structured writing, calendar, AI-assisted learning). Single context for now; split into a `CONTEXT-MAP.md` if modules diverge enough to need separate glossaries.

## Language

**Entry**:
A journal entry: one saved record per (user, date) with a required title, required primary mood, optional specific emotion, and rich-text content. Has no lifecycle beyond existing or not existing - it is written and saved, never drafted or filed in stages.
_Avoid_: Draft, post, note (in the journal-entry sense)

**Save** (entry action):
The single write action a user takes on an entry - create or update, same request shape (`CreateEntryRequest`/`UpdateEntryRequest` in `@nee3/shared-types`). There is no separate draft-saving action distinct from this.
_Avoid_: File, publish, save draft

**Recovery buffer**:
A transient, client-side (same-browser) snapshot of in-progress **Entry** form input, kept so a refresh or an interrupted session doesn't lose unsaved keystrokes. Not itself an **Entry** and not a saved/staged lifecycle state - it holds no meaning until the user takes the **Save** action, at which point it is discarded. Expires after a short window of inactivity.
_Avoid_: Draft, autosave (implies a saved artifact; this is never saved server-side)

**Primary mood**:
One of a fixed set of five broad mood categories (`happy`, `calm`, `sad`, `anxious`, `angry` - `PrimaryMood` in `@nee3/shared-types`), required on every entry. Displayed as a single-select row of colored circular dots.

**Specific emotion**:
An optional finer-grained emotion under a chosen primary mood - either one of a fixed short list per primary mood (`MOOD_TAXONOMY`) or free text typed by the user. Has no visual equivalent in `docs/design/demo.html`, which only models primary mood; its chip-row + custom-text presentation is an Aeternus-specific extension, not a demo mismatch to fix.
_Avoid_: Sub-mood, tag

**Chronological neighbor**:
The **Entry** immediately before or after a given Entry by `date` - the next (later) or previous (earlier) one in the user's overall journal history. Fixed by date alone: unaffected by any list filter (e.g. a calendar range) the user may currently have applied, since a neighbor is a property of the Entry itself, not of a particular view of the journal.
_Avoid_: Adjacent entry (ambiguous about whether filters apply)

## Dream Journal

Terminology grounded in Jungian dream-analysis method. Distinct module from Journal - not an extension of **Entry** above, since a dream's lifecycle (record, then one or more rounds of analysis added over time) doesn't fit Entry's "written and saved, never staged" definition. AI-assisted analysis (suggestive only, never authoritative) is an explicitly separate, later phase - this phase is manual recording and analysis only.

This lifecycle split is deliberate, not incidental: recording happens immediately upon waking, while analysis is a separate act taken up later, if at all.
Jungian practice treats immediate interpretation as premature - a dream needs to be lived with in waking consciousness before it can be productively read.
The module reflects this with two distinct pages rather than one: a Record page (date and narrative only) and a separate Analysis page (where Anchors, attachments, and Analysis passes are added).
Saving on the Record page returns to the dream list, not into analysis - the two acts are never chained together automatically.

Cross-dream Symbol recurrence browsing (a view answering "show every dream where I tagged this Symbol") is deferred to a later phase, referred to as **phase 6b** in planning discussion, so it isn't lost track of.
Symbol autocomplete itself (below) is in scope for this phase - only the browsing view is deferred.

**Dream**:
A dream-journal record: one entry per recorded dream with a required date and a rich-text narrative. No title - unlike **Entry** above, which requires one. Unlike Entry, a user may record more than one Dream on the same date.
_Avoid_: Dream entry (redundant with Entry's journal-specific meaning above), Dream journal (that's the module, not the record)

**Anchor**:
A highlighted range within a Dream's rich-text narrative, marking a specific passage or element (an object, person, or moment). Shared attachment point for Emotional beat, Association, and per-element Analytic analysis - one Anchor may carry more than one attachment, and attachments can be added on separate revisits.
_Avoid_: Highlight, selection

**Emotional beat**:
A freeform, self-classified emotion label a user attaches to an Anchor, marking a strong emotion felt at that point in the dream. Optional; a Dream may have many. Deliberately not drawn from Journal's Primary mood/specific emotion taxonomy above - dream-felt emotion is its own vocabulary, chosen by the user each time rather than picked from a fixed set.
_Avoid_: Mood, tag

**Symbol**:
The name of a recurring dream image, drawn from a controlled-but-growing vocabulary (autocomplete-suggested from names used in prior Dreams, exact match, case-insensitive) so recurrence can be tracked reliably.
Attached to an Anchor.
Naming a Symbol is an interpretive move made downstream of gathering Associations, so a Symbol is not a precondition for recording one.
_Avoid_: Tag, image (ambiguous with a picture)

**Analytic (reductive) analysis**:
Tracing a dream symbol or the dream as a whole backward to its personal-historical cause - repressed material, recent events, personal complexes. Answers "why did this appear." Optionally attached to an Anchor (per-element reduction, as in Freud's and Jung's own practice) or left unanchored (a whole-dream reductive reading) - a user's choice per Analysis pass, not a fixed rule.
_Avoid_: Interpretation (too generic - always specify which kind)

**Synthetic (constructive) analysis**:
Reading a dream forward/teleologically, as compensatory to the dreamer's conscious attitude, in service of individuation. Answers "what is this dream moving me toward." Always whole-dream, never anchored to a single element - unlike Analytic analysis, its defining character is about the dreamer's conscious attitude as a whole.
_Avoid_: Interpretation (too generic - always specify which kind)

**Analysis pass**:
One instance of Analytic or Synthetic analysis added to a Dream. Append-only - revisiting a Dream adds a new pass rather than overwriting a prior one, since a dream's meaning isn't treated as fixed after a single reading.
_Avoid_: Interpretation, reading (too generic - always specify Analytic or Synthetic)

**Association** (amplification):
The dreamer's personal associations to an Anchor, optionally widened with cultural/mythological/archetypal parallels.
Attached to the Anchor directly; naming the Symbol it belongs to is optional, added once the dreamer names a recurring image rather than as a precondition for recording the association.
Distinct from Analytic/Synthetic analysis - associations are raw material gathered per-Anchor, not a conclusion drawn about the dream.
_Avoid_: Interpretation, meaning

**Re-encounter**:
The act of returning to a Dream that has lain untouched since it was recorded, once enough waking time has passed for it to be readable.
A Dream qualifies while it carries no Anchor and no Analysis pass, and stops qualifying as soon as either exists - a Re-encounter invites beginning analysis, never finishing it, since an Analysis pass is append-only and its absence is not incompleteness.
_Avoid_: Unread dream, backlog, pending analysis (each implies a task left undone rather than a dream deliberately left to rest)

## Notes

Terminology grounded in the Zettelkasten method as layered by Sönke Ahrens: source-bound notes written while reading, and the user's own ideas as separate notes that must connect to what is already there. The organizing model was chosen by prototype (branch `prototype/notes-organizing-models`) over a topic-folder hierarchy, a flat tagged card grid, and a faithful Luhmann box. Folgezettel numbering and the keyword register were deliberately not adopted.

**Source**:
A thing being read or watched - a book, an article, a video, or another kind - that Literature notes are bound to. A first-class record, not free text on a note. Carries Topics. Kind is a label only; it changes no fields.
_Avoid_: Reference (Structured Writing's future term for a citation), book (too narrow)

**Literature note**:
A brief note in the user's own words, bound to one Source and to a Locator within it, written while reading. Has no title - the Locator and the note's opening words identify it. Inherits its Source's Topics.
_Avoid_: Highlight, excerpt (those are the source's words, not the user's), summary (a Literature note may cover a paragraph or a chapter)

**Locator**:
Where in a Source a Literature note comes from - a chapter, a page, a timestamp, a section.
_Avoid_: Position, reference

**Permanent note**:
An idea of the user's own, bound to no Source. Titled as a claim - a full sentence stating the idea, not a topic label. Cannot exist without at least one Link: an idea enters the box only by connecting to something already in it. May be written at any time, though the app invites it when re-reading Literature notes rather than while reading a Source.
_Avoid_: Idea (too generic), zettel (implies Folgezettel numbering, which is not used), evergreen note

**Link**:
A connection between two notes of any kind - Literature or Permanent. The web of Links is the structure of the box; there is no other hierarchy among notes.
_Avoid_: Backlink (a view of Links, not a separate thing), reference

**Topic**:
A tag carried by a Source or a Permanent note. Literature notes inherit their Source's Topics. A cross-cutting label, never a container: a Source may carry many Topics, and filtering by a Topic collects every note that carries or inherits it.
_Avoid_: Folder, category, subject
