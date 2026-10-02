# Review is harvest, not retention

Review returns the user to a Literature note they wrote earlier and asks one question: what, if anything, of your own is in this.
We decided that Review exists to harvest ideas out of past reading, never to defend against forgetting it.
A note comes back because the user has changed since they wrote it and may now have something to say that they did not have then.
Retention - the question of whether the user still knows what they read - belongs to the Phase 10 quiz and is not this module's concern.

The distinction decides the vocabulary, which is why it is worth an ADR rather than a line in the glossary.
The three Answers are statements about the note, not grades of the user: nothing of mine here, a Link was made from it, a Permanent note was written from it.
"Nothing of mine here" is a complete, successful outcome, and most notes will get it.
Due-ness carries no deadline and nothing accrues: a note due for a month is due in exactly the sense a note due since this morning is due, and there is no overdue, no backlog, no streak, and no count on screen but the rail badge's "Review · N due".
A note that has been answered drops behind the due ones and remains available forever, because a second look at the same reading months later is a different question, not a repeat of the first.

This is a departure from what a reader might expect, since the obvious reference implementation for "notes that come back" is spaced repetition.
The research findings (`docs/research/zettelkasten-workflow.md`, section 5) are the reason it was not taken.
The method delivers elaboration well and retrieval practice barely: writing a Literature note closed-book is the only retrieval attempt in the whole workflow, and everything after it is elaboration and connection.
Spacing is absent from the sources entirely - Ahrens's one-day deadline is about not forgetting what you _meant_, not a review schedule - and Ahrens treats rereading itself as an illusion of competence.
Adding a grading loop on top of a method that does not ask for one would import the ceremony without the mechanism.

The one Answer this excludes is the one that was asked for and refused.
"Come back sooner" was rejected as a fourth Answer because it is a grading verb: it asks the user to rate how well they handled a note, which is the self-assessment the module is built to avoid, and it introduces an interval where the design has none.
Where a note genuinely has unfinished business, the module says so structurally instead - a note flagged as an open question and answered "nothing of mine here" sorts ahead of the rest of the already-answered band, without anyone grading anything.

Deferring retention is not the same as banning a cadence, and the line between them is the thing this ADR fixes.
#76 may decide that answered notes should return on a ladder, and that is compatible with everything above: _when_ a note comes back is an open question, _why_ it comes back is settled.
What is not compatible is a schedule whose interval responds to how the user answered - that is retention scoring under another name, and it would make the Answers into grades retroactively.

## Status

Accepted.

#76 may add a return cadence for answered notes without reopening this ADR, provided the cadence does not read the Answer as a quality signal.

## Considered options

**Spaced repetition over Literature notes.**
Rejected on the research rather than on taste.
Section 5 of the findings concludes that the module should not add spaced review, since the box produces retention through connection if at all, and the gap it leaves is the one the Phase 10 quiz is for.
Adopting SM-2 or a Leitner ladder would also require a self-assessment on every note, which is the thing the Answers were designed not to be.

**"Come back sooner" as a fourth Answer.**
Rejected.
It is a grade in the costume of a scheduling hint, and the information it carries is already available structurally from the open-question flag and the Answer history.

**An overdue state, or a count that grows.**
Rejected.
Both convert a standing invitation into a debt, and a debt is the failure mode that empties a review queue by making the user avoid it.
This is also why the badge counts notes never answered rather than everything available.

**Retention and harvest in one pass, with the quiz folded into Review.**
Rejected and deferred rather than refused outright.
The quiz is Phase 10 and will be AI-generated from the same corpus; whether it lives inside Review or beside it is a question for that phase, which this decision deliberately does not pre-empt.
What it does fix is that the quiz may not borrow Review's vocabulary: a quiz grades, Review does not.

**Letting answered notes leave the queue permanently.**
Rejected.
The premise of harvest is that the user changes, so a note that yielded nothing in March is a legitimate candidate in September.
A queue the user can finish is a queue that is finished.

## Consequences

The queue has three bands and no scores: due notes oldest-first flat across Sources; then answered notes whose most recent Answer was "nothing of mine here" and whose open-question flag is still set, least-recently-answered; then the rest of the answered notes, least-recently-answered.
A pass ends at the end of the due notes, which is what makes "N due" a number that can reach zero.

Answers are stored as append-only history rather than as state (ADR 0011), which is what keeps #76 cheap: any ladder, or none, is computable from rows already being collected.

Nothing in the interface shows an interval, a next-due date, a pass count, or a streak.
The history exists to be queried by #76 and by Phase 10, not to be read by the user.

The module has no concept of lateness anywhere, which means there is nothing to notify about.
A Notes presence on the dashboard, if one is ever decided on, cannot be a nag; it would have to be an invitation in the shape of ADR 0010's Re-encounter line.
