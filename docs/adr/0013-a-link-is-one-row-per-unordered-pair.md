# A Link is one directed row per unordered pair, carrying a reason from each end

#69 settled a Link's behaviour and left its storage to this ticket.
A Link is directed: the note that makes it is the origin, the other the target.
It carries a required one-line reason written at link time.
There is at most one Link per unordered pair, so linking B to A when A to B already exists shows the existing Link rather than creating a second, and a reason offered from that second end is added to the Link that is already there.
Both ends are notes of either kind, and the mandatory-Link count for a Permanent note counts Links in either direction.

We decided on one row per Link in a `links` table: `origin_note_id`, `target_note_id`, a NOT NULL `reason`, a nullable `target_reason`, and timestamps.
Uniqueness of the unordered pair is a unique index on `(least(origin_note_id, target_note_id), greatest(origin_note_id, target_note_id))`, so the constraint holds without the application normalizing the pair before every insert.
A CHECK forbids `origin_note_id = target_note_id`, since a note linking to itself states nothing.
Both foreign keys cascade on delete, as the mechanics that run after the delete guard has allowed the deletion (ADR 0012).

The reason is two columns because #69 gave the second end something to say and no row of its own to say it in.
`reason` is the origin's, written when the Link was made and required.
`target_reason` is written only if the target end later links back through the picker and finds the Link already there, and it stays null in the ordinary case.
Both are shown on the connections view, each attributed to the direction that produced it, and each is edited in place by the end that wrote it.
Appending the second statement to the first column instead would merge two people's reasoning - the same person months apart, which is the same problem - into one string that neither end can edit without stepping on the other, at exactly the moment the method says the elaboration matters.

Direction survives in the row, so it stays available to the connections view's two groups, "Connects to" and "Connected from", without a second table or a stored flag.
Every other rule reads across both columns: a note's Links are `origin_note_id = :id OR target_note_id = :id`, and so is the mandatory-Link count, and so is the Link count that orders Permanent notes in the Topic view (#71).

## Status

Accepted.

## Considered options

**Two rows per Link, one per direction.**
Rejected.
It makes every read symmetric for free, and makes the one thing that must be true - at most one Link per pair - unenforceable by any index, since the pair is now legitimately present twice.
Editing a reason, removing a Link, and counting Links all become two-row operations that are correct only while nothing has ever half-failed.

**An undirected row with the pair stored normalized, lower id first.**
Rejected.
It gets the uniqueness constraint even more cheaply than the functional index does, and it throws away which end made the Link, which the connections view needs to group by and which the reason columns need in order to be attributable.
Direction is the cheapest thing in the row and the only one that cannot be recomputed.

**A `link_reasons` child table, one row per reason.**
Rejected as the shape to adopt if a Link ever accumulates more than two statements.
Today it is at most two, one per end, bounded by the uniqueness rule itself, so a child table buys an extra join on the connections view and an extra insert path to enforce "at most one per end" in exchange for generality nothing has asked for.

**Storing Links as inline marks in the note body.**
Rejected in #69, before storage was on the table, and recorded here because it is the shape most Zettelkasten tools use.
Every rule this module has - uniqueness per pair, a required reason, the mandatory-Link guard, counting either direction - is a predicate on a relation and a parsing problem on a mark.

## Consequences

The unordered-pair uniqueness is a functional index, so the picker must look for an existing Link in both directions before offering to create one.
It finds the Link, shows its reason, and offers to add the reason from this end; it does not insert and catch the constraint violation, because the user-facing move is to show what is already there.

Removing a Link is refused, not warned, when it would leave a Permanent note at either end with zero Links (#69).
The count is the two-column predicate above, run for both endpoints, and the refusal names the note that would be orphaned.

`target_reason` is null on most rows, and that is a fact about the Link rather than missing data: it means nobody has linked back from the other end.
Nothing in the interface reads its absence as incomplete.
