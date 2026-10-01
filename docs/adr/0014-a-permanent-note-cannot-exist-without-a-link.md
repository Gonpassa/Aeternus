# A Permanent note cannot exist without a Link, at any moment

A Permanent note is an idea of the user's own, and the method's claim is that an idea enters the box only by connecting to something already in it.
Aeternus takes that literally.
We decided the invariant holds at every moment rather than at the moment of writing: a Permanent note cannot be saved without at least one Link, its last Link cannot be removed, and no note of either kind can be deleted while it is some Permanent note's only Link.
The count is taken in either direction, so a note reachable only from another note's Links is linked.

Four guard points follow from "at every moment", and three of them are the ones a cheaper reading would skip.
Saving is the obvious one, and it is why creating a Permanent note and creating its first Link are a single transaction over one request rather than two requests with an unlinked note between them.
Removing a Link is guarded at the Link's own endpoint, since removal is the symmetrical way to produce the state the save guard exists to prevent.
Deleting a Literature note is guarded, which is where the invariant stops being local to Permanent notes: a Literature note is a legitimate Link endpoint, so deleting one can orphan an idea that has nothing to do with the Source being thrown away.
Deleting a Source is the same guard applied once across the batch of Literature notes it cascades to.

A guard that bites is refused, not warned about, and the refusal names the Permanent notes that would have been left unlinked.
Naming them is what makes the refusal actionable: the user's next move is to link those notes elsewhere or delete them too, and neither is possible from a message that says only "this would orphan 3 notes".
This is also the answer to the friction objection.
The constraint is only tolerable because the way out is always visible at the moment it blocks.

Counting in either direction is not a softening of the rule, it is the rule stated correctly.
An outbound-only count would report a Permanent note as unlinked while it sits in another note's connections view, reachable and read, which is a false statement about the shape of the box.
Directed storage is kept for the connections view's two groups (ADR 0013); it is not a claim that an inbound Link connects the note any less.

The consequence worth stating plainly is a negative one: there is no unlinked state.
No orphan list, no "notes needing connection" surface, no badge.
A state that cannot be reached does not need a view, and the alternative - letting unlinked notes exist and showing them somewhere - is a different decision wearing this one's clothes.

## Status

Accepted.

## Considered options

**Guard at save time only.**
Rejected.
It makes the invariant true of notes as written and false of notes as they age, which is the worse of the two, since an idea that lost its last connection is exactly the one the method says is not in the box.
The guards it omits are not edge cases: removing a Link and deleting a note are ordinary actions, and under this option either one silently produces the state the save guard was written to prevent.

**Allow unlinked Permanent notes, and surface them as orphans on the thinking page.**
Rejected.
It is the friendlier shape, and it trades a constraint the user meets once for a list the user has to maintain forever.
It also changes what a Permanent note means: the mandatory Link is the only thing separating this module's Permanent note from a note app's note, and made optional it becomes a strong suggestion that the interface then has to nag about.
The refusal naming the affected notes answers the friction this option was trying to buy off.

**Guard saving and Link removal, but cascade deletions freely.**
Rejected.
It is the shape that feels consistent from inside the Permanent note and is inconsistent from outside it: deleting a Source would quietly strip Links off ideas written months later and elsewhere.
The guard is cheapest to state and most valuable exactly at the point where the user cannot see what they are about to break.

**A soft minimum - warn on save, block nothing.**
Rejected.
A warning that can be dismissed is a preference, and this is a claim about what the data means.

## Consequences

Permanent note creation is one transactional endpoint carrying the note and its first Links together, and there is no endpoint that creates a bare Permanent note.
The client composer therefore cannot offer "save and link later", and the Link picker is part of the composer rather than a step after it.

Every delete path in the module - Literature note, Permanent note, Source - runs the same check before its cascade, and the check is the module's single most-shared piece of logic.
Guard and cascade stay distinct: the guard decides whether the deletion happens, the cascade is only the mechanics once it does (ADR 0012).

Deleting a whole reading - a Source and everything under it - can be refused by a Permanent note the user wrote long after and will not remember.
That is a real cost, accepted because the alternative is a box whose structure quietly decays, and mitigated only by the refusal naming the notes.

Because the state cannot occur, nothing in the interface reports on it, and no migration ever has to repair it.
