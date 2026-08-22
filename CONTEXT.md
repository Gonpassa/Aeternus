# Aeternus

Personal hub application (journaling, structured writing, calendar, AI-assisted learning). Single context for now; split into a `CONTEXT-MAP.md` if modules diverge enough to need separate glossaries.

## Language

**Entry**:
A journal entry: one saved record per (user, date) with a required title, required primary mood, optional specific emotion, and rich-text content. Has no lifecycle beyond existing or not existing - it is written and saved, never drafted or filed in stages.
_Avoid_: Draft, post, note (in the journal-entry sense)

**Save** (entry action):
The single write action a user takes on an entry - create or update, same request shape (`CreateEntryRequest`/`UpdateEntryRequest` in `@nee3/shared-types`). There is no separate draft-saving action distinct from this.
_Avoid_: File, publish, save draft

**Primary mood**:
One of a fixed set of five broad mood categories (`happy`, `calm`, `sad`, `anxious`, `angry` - `PrimaryMood` in `@nee3/shared-types`), required on every entry. Displayed as a single-select row of colored circular dots.

**Specific emotion**:
An optional finer-grained emotion under a chosen primary mood - either one of a fixed short list per primary mood (`MOOD_TAXONOMY`) or free text typed by the user. Has no visual equivalent in `docs/design/demo.html`, which only models primary mood; its chip-row + custom-text presentation is an Aeternus-specific extension, not a demo mismatch to fix.
_Avoid_: Sub-mood, tag

## Dream Journal

Terminology grounded in Jungian dream-analysis method. Distinct module from Journal - not an extension of **Entry** above, since a dream's lifecycle (record, then one or more rounds of analysis added over time) doesn't fit Entry's "written and saved, never staged" definition. AI-assisted analysis (suggestive only, never authoritative) is an explicitly separate, later phase - this phase is manual recording and analysis only.

**Dream**:
A dream-journal record: one entry per recorded dream with a required date and a rich-text narrative. No title - unlike **Entry** above, which requires one.
_Avoid_: Dream entry (redundant with Entry's journal-specific meaning above), Dream journal (that's the module, not the record)

**Anchor**:
A highlighted range within a Dream's rich-text narrative, marking a specific passage or element (an object, person, or moment). Shared attachment point for Emotional beat, Association, and per-element Analytic analysis - one Anchor may carry more than one attachment, and attachments can be added on separate revisits.
_Avoid_: Highlight, selection

**Emotional beat**:
A freeform, self-classified emotion label a user attaches to an Anchor, marking a strong emotion felt at that point in the dream. Optional; a Dream may have many. Deliberately not drawn from Journal's Primary mood/specific emotion taxonomy above - dream-felt emotion is its own vocabulary, chosen by the user each time rather than picked from a fixed set.
_Avoid_: Mood, tag

**Symbol**:
The name of a recurring dream image, drawn from a controlled-but-growing vocabulary (autocomplete-suggested from names used in prior Dreams, exact match) so recurrence can be tracked reliably. Attached to an Anchor; an Association is always attached to a Symbol.
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
The dreamer's personal associations to a specific Symbol at an Anchor, optionally widened with cultural/mythological/archetypal parallels. Distinct from Analytic/Synthetic analysis - associations are raw material gathered per-Symbol, not a conclusion drawn about the dream.
_Avoid_: Interpretation, meaning
