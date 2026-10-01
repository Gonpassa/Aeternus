# A Link carries a required reason, written at the moment of linking

A Link connects two notes, and we decided it cannot exist without one line of the user's own words saying why.
The reason is required at link time, plain text, one per end, with no minimum length and no format.
A target picked without a reason blocks the save exactly as a missing Link does (ADR 0014).

This is a departure from the method as its primary sources describe it, and worth recording as one rather than leaving to be discovered.
Luhmann describes linking mechanically and says nothing about justifying a link; his concern is that the connection be recorded at both ends.
Ahrens treats link-making as the thinking itself but asks for no written justification.
The prescription comes from zettelkasten.de, which is explicit: "To make the most of a connection, always state explicitly why you made it. This is the link context", and "If you just add links without any explanation you will not create knowledge."
Two of the three sources do not require it, so adopting it is a choice, not fidelity.

The choice follows from what this box is for.
Luhmann's and Ahrens's boxes are oriented toward producing text, and that orientation supplies its own forcing function: a connection that turns out to be empty is found and discarded when the writing is attempted.
Aeternus's box is oriented toward learning, and the writing that would have exposed a hollow Link never happens.
Something has to carry the elaboration instead, and the reason is the smallest thing that can: a connection you cannot say anything about is the signal that the Link is not real, caught at the moment of making it rather than never.

Writing it at link time, rather than allowing it to be added later, is the whole mechanism.
A reason supplied afterwards is reconstructed - the user is looking at two notes and inventing a relationship - where a reason supplied at link time is a report of the thought that produced the Link.
Those are different artifacts, and only the second is worth storing.

The reason is also the unit this module uses to decide when an idea has outgrown a Link.
One line is a connection; when the line will not stay one line, the user is writing a Permanent note, and the interface offers exactly that move.
This is why there is no minimum length and no prompt to elaborate: the overflow is the signal, not a quality bar on the field.

Each end gets its own reason, both optional after the first.
When the target end later links back, the picker finds the existing Link and takes a second line rather than creating a second Link (ADR 0013), because what the two notes say to each other is often not symmetrical.

## Status

Accepted.

## Considered options

**No reason, following Luhmann and Ahrens.**
Rejected.
It is the faithful option and it relies on a forcing function this module does not have, since nothing downstream of the Link ever tests whether the connection meant anything.
The organizing-models prototype stored Links this way, and the Links it accumulated were indistinguishable from each other a week later.

**An optional reason, prompted but skippable.**
Rejected, and it was the closest call.
Optional makes the field a preference and the Link the thing being stored, which inverts what the decision above claims: the reason is the user's thinking, and the Link is the filing.
It also fails in the one case that matters, the half-remembered association typed quickly, which is exactly the Link an optional field is skipped on and exactly the Link that turns out to be empty.

**A reason addable later, from the connections view.**
Rejected as the default, kept as the editing affordance.
Reasons are editable in place from either end afterwards; what is rejected is a Link that is allowed to exist with none while it waits.

**A relationship type instead - supports, contradicts, extends, a fixed list.**
Rejected.
A fixed vocabulary is faster to enter and loses the content, since "contradicts" names a shape and the sentence names what is actually in tension.
It also invites a taxonomy argument on every link, and the research found no source prescribing one.

**A relationship type alongside the reason.**
Rejected as unasked-for generality.
Nothing in the module reads a type: Links are traversed, counted, and read, never filtered by kind.
It is addable later against a populated `reason` column if a query ever wants it.

## Consequences

The Link picker is never a bare target picker.
Every path that creates a Link - the Permanent note composer, the reading page's Link affordance on a Literature note, the connections view on any note - picks a target and takes a line, in that order, and cannot save between the two.

`links.reason` is NOT NULL and `links.target_reason` is nullable (ADR 0013), which is the storage shape this decision implies rather than an independent choice.

The reason inherits the module's generous-max convention at 140 characters, chosen so that one line stays one line.
The ceiling is a sanity bound, not a nudge: nothing counts down, and a user who hits it is being told to write a Permanent note by the only mechanism that should tell them.

Links cost more to make than in any of the source systems, and there will be fewer of them.
That is the intended trade, on the view that a smaller web of stated connections is more use for learning than a larger web of recorded adjacencies.
