# A Review Answer is an append-only history row, not state on the Literature note

Review asks one question of one Literature note at a time and takes one of three Answers: nothing of mine here, a Link was made from it, or a Permanent note was written from it.
The obvious implementation is two columns on the note - a last-answered timestamp and a count - read and overwritten on each Answer.
We decided instead that every Answer writes a row to its own table: the Literature note, when, which Answer, and a nullable reference to what the Answer produced (the Link or the Permanent note).
Due-ness is a query over that history, not a field.

The forcing decision was scheduling, and specifically the decision not to have one yet.
#75 shipped Review as a harvest queue: a note is due until it receives an Answer, answered notes drop behind the due ones and remain available, and there are no intervals, no due dates and no notion of lateness.
Whether answered notes should come back on a ladder was split out to #76 and deliberately left open, because its central question - whether forty due notes still feel inviting - cannot be answered against seeded prototype data and can be answered easily against a year of real notes.
Derived state would make that deferral expensive: `nextDueAt` and `passCount` are already a schedule, committed to before the evidence exists, and adopting a different one later means a migration over data that cannot reconstruct what it discarded.
History makes the deferral free.
Any ladder, any multiplier, or no schedule at all is computable from rows already being collected, so #76 can be decided late without being decided badly.

The produced-reference is the part most likely to be trimmed as redundant, and it is the reason the log is worth keeping.
Without it the table records that the user showed up.
With it the table records what the box actually yielded - which notes led to Links, which to Permanent notes, and which repeatedly led to nothing.
That is the material #76 would weight a ladder by, and the material a Phase 10 quiz would scope by.

The Answer is written on completion, never on intent.
Choosing "Write a Permanent note from this" and then abandoning the composer writes no row, and the note stays due.
The alternative drains the queue on good intentions and quietly corrupts every later reading of the history.

## Status

Accepted.

## Considered options

**`nextDueAt` and `passCount` on the Literature note.**
Rejected: it is the cheaper shape only while the schedule is settled, and the schedule is precisely what #75 declined to settle.
It also answers a question nobody asked - what is this note's current standing - while losing the one that #76 and Phase 10 both need, which is what this note has produced over time.

**A single `answeredAt` timestamp, with Answers unrecorded.**
Rejected: it cannot distinguish a note dismissed three times from one that produced a Permanent note, which is the distinction any future weighting rests on.
It is also indistinguishable in cost from the full row.

**History, but without the produced-reference.**
Rejected: the Link and the Permanent note are already created at that moment and already have identities, so the reference costs one nullable column and is unreconstructable afterwards - the Permanent note's own timestamp is a near miss, not a fact.

**Deciding the ladder now and storing derived state against it.**
Rejected on evidence, not on cost.
`docs/research/zettelkasten-workflow.md` section 5 concludes that the module should not add spaced review, since the method delivers elaboration well and retrieval practice barely.
Adding one anyway, before the corpus exists to judge it, would be overruling the research with a guess.

## Consequences

Due-ness is computed, not stored, so Review's queue is a left join against the history table rather than a column scan.
At this corpus size that is irrelevant; it is noted so a future reader does not mistake the join for an oversight.

The history table is append-only in the same sense and for the same reason as Analysis passes in the dream module: a second look at the same material does not overwrite the first, because the first was not wrong.
A user who answers "Nothing of mine here" in March and writes a Permanent note from the same note in September has two true facts about that note, not a correction.

Nothing in the interface exposes any of it.
There is no next-due date, no pass count and no interval anywhere on screen, since numbers are the grading ceremony the module set out to avoid; the one number shown is the rail badge, "Review · N due", counting notes that have never been answered.
The history exists to be queried by #76 and by Phase 10, not to be read by the user.

Editing or deleting a Literature note leaves its history rows meaningful, since they reference the note rather than copying it.
Deleting the note cascades them away; #72 decides the constraint.
