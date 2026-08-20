# Aeternus.3

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
An optional finer-grained emotion under a chosen primary mood - either one of a fixed short list per primary mood (`MOOD_TAXONOMY`) or free text typed by the user. Has no visual equivalent in `docs/design/demo.html`, which only models primary mood; its chip-row + custom-text presentation is an Aeternus.3-specific extension, not a demo mismatch to fix.
_Avoid_: Sub-mood, tag

## Dream Journal

Terminology grounded in Jungian dream-analysis method. Distinct module from Journal - not an extension of **Entry** above, since a dream's lifecycle (record, then one or more rounds of analysis added over time) doesn't fit Entry's "written and saved, never staged" definition.

**Analytic (reductive) analysis**:
Tracing a dream symbol backward to its personal-historical cause - repressed material, recent events, personal complexes. Answers "why did this appear."
_Avoid_: Interpretation (too generic - always specify which kind)

**Synthetic (constructive) analysis**:
Reading a dream forward/teleologically, as compensatory to the dreamer's conscious attitude, in service of individuation. Answers "what is this dream moving me toward."
_Avoid_: Interpretation (too generic - always specify which kind)

**Association** (amplification):
The dreamer's personal associations to a specific dream image, optionally widened with cultural/mythological/archetypal parallels. Distinct from analytic/synthetic analysis - associations are raw material gathered per-image, not a conclusion drawn about the dream as a whole.
_Avoid_: Interpretation, meaning
