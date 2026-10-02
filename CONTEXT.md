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

The module has two pages, **Read** and **Review**, defined below with the rest of the vocabulary. The decisions behind the terms live in ADRs 0011 to 0017: Answers as append-only history, one notes table with a kind discriminator, a Link as one row per unordered pair, the mandatory Link on a Permanent note, the required Link reason, Review as harvest rather than retention, and plain-text note bodies.

**Source**:
A thing being read or watched - a book, an article, a video, or another kind - that Literature notes are bound to. A first-class record, not free text on a note. Carries Topics. Kind is a label only; it changes no fields. Has no lifecycle: there is no reading status, and the only signal that a Source is active is the recency of its Literature notes, which cannot go stale the way a status left unmaintained does.
_Avoid_: Reference (Structured Writing's future term for a citation), book (too narrow), currently reading / finished (statuses this module deliberately does not have)

**Literature note**:
A brief note in the user's own words, bound to one Source and to a Locator within it, written while reading. Has no title - the Locator and the note's opening words identify it. Inherits its Source's Topics. Fully editable after capture: writing it closed-book is a discipline at the moment of capture, not a constraint on the stored text, and a Link points at the note's identity rather than at its wording.
_Avoid_: Highlight (the source's words, not the user's), summary (a Literature note may cover a paragraph or a chapter), excerpt as a name for the note itself - an **Excerpt** is one optional part of a note, below

**Excerpt**:
The author's exact words, optionally kept alongside a **Literature note** and sharing its **Locator**. Stored apart from the note's body so that the source's phrasing and the user's own are never merged: the body is the comprehension test, and the excerpt is there for the cases where the wording itself is the thing worth having. Never required, revealed on demand rather than shown as an empty field, and removed by emptying it.
_Avoid_: Quote (ambiguous about who is being quoted), highlight, body

**Locator**:
Where in a Source a Literature note comes from, in two free-text parts: a **section** (a chapter, a heading, a video segment) and a **position** (a page, a timestamp, a Kindle location, a paragraph). At least one of the two is required; either alone is a complete Locator. The same two parts serve every Source kind, so that changing a Source's kind strands nothing and "Kind changes no fields" holds. Rendered as one string wherever a note appears ("Ch. 3 · p. 42", "Intro · 12:30"), with a digits-only position shown as "p. N" and stored as typed.
_Avoid_: Page number (too narrow, and kind-specific), reference, timestamp (one position among several)

**Permanent note**:
An idea of the user's own, bound to no Source. Titled as a claim - a full sentence stating the idea, not a topic label. Cannot exist without at least one **Link**, at any moment and not only at the moment it is written: it cannot be saved without one, its last Link cannot be removed, and no note of either kind can be deleted while it is some Permanent note's only Link, the count taken in either direction. A refusal names the Permanent notes that would have been left unlinked. An idea enters the box only by connecting to something already in it, so an unlinked Permanent note is not a state the app can be in. May be written at any time, though the app invites it when re-reading Literature notes rather than while reading a Source.
_Avoid_: Idea (too generic), zettel (implies Folgezettel numbering, which is not used), evergreen note, orphan (there is no unlinked state to name)

**Link**:
A connection between two notes of any kind - Literature or Permanent - carrying one line of the user's own words saying why they belong together. Directed: the note that makes the Link is its **origin**, the other its **target**. The reason is required at link time and is the smallest unit of the user's thinking in the module - a reason that cannot be written is the signal the Link is not real; when the target end later links back, it adds its own reason to the Link already there rather than making a second one. There is at most one Link per unordered pair. A Link is a structured relation attached to a note, never a mark inside the note's text. The web of Links is the structure of the box; there is no other hierarchy among notes.
_Avoid_: Backlink (a view of Links, not a separate thing), reference, wiki link / mention (both imply a mark in the body text)

**Read**:
The reading side of the module, and the name of its page. A catalog of **Source** cards filterable by **Topic**, and, with a Source open, the reading page itself: capture on one side, that Source's Literature notes in creation order on the other. Everything written while a Source is in front of the user happens here - Literature notes, the Links between them, and the Permanent note written when a reason outgrows one line.
_Avoid_: Library, shelf, reading list (each implies a queue of things to read rather than a place to write)

**Review**:
The act of returning to a **Literature note** to ask what, if anything, of the user's own is in it, and the name of the page where that happens - one note at a time, with the three **Answers** and a panel for finding Link targets. Harvest, not retention: a note comes back because the user has changed since they wrote it and may now have something to say that they did not have then, never because they are at risk of forgetting what they read. Retention is the later AI quiz's concern, not this module's.
_Avoid_: Revision, study, drill (each implies recall is being tested)

**Answer**:
What Review asks of one **Literature note**, exactly one of three: nothing of the user's own is here, a **Link** was made from it, or a **Permanent note** was written from it. Recorded on completion rather than on intent - abandoning a Permanent note composer leaves the note unanswered - and append-only, so a note carries a history of Answers rather than a current state. Leaving Review part-way through a note is not an Answer.
_Avoid_: Grade, rating, score, response (each implies the user is rating themselves or the note)

**Due**:
Said of a **Literature note** that has never received an **Answer**. Every Literature note is due from creation. Due-ness carries no deadline and no notion of lateness: a note that has been due for a month is due in exactly the same sense as one due since this morning, and nothing accrues in the meantime. Answering a note does not remove it from Review for good - it drops behind the due ones and remains available.
_Avoid_: Overdue, pending, backlog, unprocessed (each implies a debt that grows)

**Open question**:
A **Literature note** flagged while reading as something the user was unsure of and left unanswered. Orthogonal to the **Answer**: no Answer resolves it, since an open question is usually settled by later reading rather than by Review, and the user clears the flag explicitly. It stays listed on its **Source** until cleared.
_Avoid_: Todo, unresolved note

**Topic**:
A tag carried by a Source or a Permanent note, optional on both. Literature notes inherit their Source's Topics. A cross-cutting label, never a container: a Source may carry many Topics, and filtering by a Topic collects every note that carries or inherits it. One vocabulary per user, unique on the lowercased name and created by typing a new one. A Topic can be renamed across every carrier at once, and renaming it to a name that already exists is how two Topics are merged - there is no separate merge. Deleting one detaches it from every carrier and touches no note. A Topic nobody carries any more stays in the vocabulary with a count of zero until it is deleted, since the word was chosen deliberately and removing it silently would lose that choice.
_Avoid_: Folder, category, subject

The **Topic view** - the page a Topic tag leads to - collects the Permanent notes carrying the Topic, most-linked first, and then the Sources carrying it. It does not list inherited Literature notes individually; those stay reachable through their Source. This is the browsing view only: filtering a list by a Topic still collects every note that carries or inherits it, as above.
