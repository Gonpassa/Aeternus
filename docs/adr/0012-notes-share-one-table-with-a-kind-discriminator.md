# Literature and Permanent notes share one table with a kind discriminator

The Notes module has two note kinds (`CONTEXT.md`), and they overlap less than the shared word "note" suggests.
A Literature note is bound to exactly one Source, carries a two-part Locator, an optional verbatim excerpt, an open-question flag, and no title (#68).
A Permanent note is bound to no Source, is titled as a claim, carries its own Topics, and cannot exist without at least one Link (#69).
What they share is a plain-text body, a pair of timestamps, and an owner.

Three things nonetheless want them to be one kind of thing.
A Link joins any two notes from either end, in any combination (#69).
A Review Answer names a Literature note and may point at the Permanent note it produced (ADR 0011).
Structured Writing (Phase 8) will cite a note, and a Phase 10 quiz will scope by Source or Topic, and both were promised addressability by the wayfinder map rather than a case analysis over two id spaces.

We decided on a single `notes` table with a `kind` enum column (`literature`, `permanent`), the per-kind field requirements expressed as CHECK constraints rather than as NOT NULL.
`kind` is fixed at insert: a Literature note never becomes a Permanent note, because the method's whole point is that the second is written from scratch after re-reading the first.

The constraints carry the weight that separate tables would otherwise carry in the column definitions.
A `literature` row requires `source_id`, forbids `title`, and requires at least one of `section` and `position` to be non-empty.
A `permanent` row requires `title`, and forbids `source_id`, `excerpt`, `section`, `position`, and the open-question flag.
Where another table needs to reference one kind specifically, it does so declaratively: `notes` carries a unique index on `(id, kind)`, and the referencing table carries a redundant `kind` column with a composite foreign key into it plus a CHECK pinning that column to one value.
That is the same trick `associations` already uses to tie a Symbol attachment to its own Anchor, so the pattern is established here rather than invented.
Review Answers use it to reference Literature notes only; the Topic join table uses it to reference Permanent notes only.

The identity question #72 asked is answered by this decision as a side effect.
`notes.id` and `sources.id` are the stable handles, serial and never reused, and they survive every edit to the text they name, because editing a note updates a row rather than replacing one.
A future citation from Structured Writing is a foreign key, not a search string, and a quiz scopes by `source_id` or through the Topic joins without first asking which kind of note it is holding.

## Status

Accepted.

## Considered options

**Two tables, `literature_notes` and `permanent_notes`.**
Rejected on what it does to Links.
Every column can be NOT NULL, which is the real attraction, but the `links` table then has no single column to point at.
It has to hold either four nullable endpoint columns with a check that exactly two are set, or a kind-plus-id pair with no foreign key at all, and in both shapes the unordered-pair uniqueness constraint and the "count Links in either direction" guard stop being one index and one predicate.
Review Answers and any future citation inherit the same branch.
The integrity gained inside the two tables is paid for with integrity lost everywhere they are referenced, which is the majority of the module.

**Class-table inheritance: a `notes` identity table plus a detail table per kind.**
Rejected as the honest but expensive version of the same idea.
It gives both the single FK target and NOT NULL columns, and it is what we would reach for if the two kinds diverged further.
At five kind-specific columns it buys that with a join on every read of a note, a two-statement insert inside a transaction, and a shape no other module in this codebase uses - the dream module deliberately keeps ownership chains one hop.
If a third note kind ever appears, or the kinds grow their own substantial sub-structures, this is the migration to make.

**One table, no CHECK constraints, requirements enforced only in validation.**
Rejected.
The per-kind requirements are the definitions of the two kinds, not input hygiene, and the one thing a single table genuinely gives up is the database's ability to state them.
Giving that up twice leaves the shape of a note knowable only by reading the controller.

## Consequences

Reading a row means reading `kind` first.
Five columns are meaningful for one kind and null for the other, and every list query that wants one kind filters on `kind`, which is indexed alongside the columns each list already sorts by.

The invariants that no constraint can express stay in the application layer, where they were always going to be.
The mandatory-Link guard and the delete guards must name the Permanent notes that would be orphaned (#69), which is a query and a message, not a constraint violation surfaced to the user.
CHECK constraints are the floor under those guards, not a replacement for them.

Cascades are set as the mechanics that run once a guard has passed, never as the guard itself.
Deleting a Source cascades to its Literature notes (#70), and deleting a note cascades to its Links and its Answer history (ADR 0011), but the request is refused before any of that if the deletion would leave a Permanent note with zero Links.

The "generous max length" convention #68 asked for lands as validation, not as column types.
Text columns stay `text`, as everywhere else in this schema, and the maxima live in `validation.ts` where the error message can be written in the module's voice.
