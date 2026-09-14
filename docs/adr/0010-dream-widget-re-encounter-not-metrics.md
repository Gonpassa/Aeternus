# The Dream Journal dashboard card carries no cadence metrics, and Re-encounter picks the newest eligible Dream

The Journal dashboard card answers "what have I been feeling lately, and am I keeping it up" with a streak and a mood snapshot.
Transplanting that shape onto the Dream Journal would be actively wrong rather than merely unhelpful: dream recall is not a discipline a user can will, so a low count reports on their sleep rather than their effort, and a streak turns an involuntary faculty into a scoreboard.
We decided the Dream Journal card carries no number of any kind - no dream count, no "last recorded N nights ago", no recall-frequency chart, and no Symbol recurrence counts (the last also being deferred to phase 6b).
It holds exactly two things: a dominant call to action out to the Record page, and one Re-encounter line.

The Re-encounter line is the domain-native replacement for the streak.
Where a streak says "you have been inconsistent", a Re-encounter says "this dream has sat long enough to be readable", which is what Jungian practice actually asks for and is the reason `CONTEXT.md` splits recording from analysis in the first place.
A Dream is eligible while it carries no Anchor and no Analysis pass, and while it was recorded at least seven nights ago.

Eligibility deliberately turns on having no Anchor rather than on having no Analysis pass.
Analysis passes are append-only precisely because a dream's meaning is not fixed after one reading, so a missing pass is not an unfinished task, and keying off it would nag forever about dreams the user had richly associated and deliberately left unconcluded.

The card picks the **newest** eligible Dream, not the oldest.
Oldest-first is the intuitive choice and is the trap: the oldest untouched dream never moves until the user acts on it, so the card becomes a fixed reproach, which is the streak failure mode wearing a different coat.
Newest-eligible rotates on its own every time a dream is recorded, and surfaces material while it is still alive to the dreamer.

## Status

Accepted.

## Considered options

**A recent-dreams list, mirroring the Journal card's recent entries.**
Rejected: the dreams timeline is one click away and renders the same material better, so the card would be a worse copy of an existing page rather than something that answers a question at a glance.

**A neutral "last recorded" date instead of a streak.**
Rejected: it reads as information but behaves as a target rate, and it fails for the same reason the streak does.

**Symbol recurrence counts ("Water, 6 dreams").**
Rejected for now, not on principle: it is the single most interesting cross-dream fact and it is the card's intended second row once phase 6b ships the browsing view.
Shipping the count alone would consume 6b's best idea while leaving its view unbuilt, and would train the user to click something inert.

**A quiet line when nothing is eligible ("Nothing waiting to be read").**
Rejected: announcing absence turns "nothing eligible" into a status report on the user's dream practice, which is a metric with words instead of numbers.
The slot is simply empty and the card is shorter.

**Falling back to the most recent Dream when nothing is eligible.**
Rejected: it redefines what the slot means depending on state, so the user can never trust what is in it.

## Consequences

The seven-night clock runs on the Dream's `createdAt`, not its `date`, while the card displays the dream's own age.
This protects the invariant that a dream never appears as a Re-encounter in the same week it was written down: back-dating a dream recorded today would otherwise make it eligible on save, which reads as a bug whatever the domain justification.

Eligibility is computed server-side by a new `GET /dreams/summary`, taking the same `asOf` query parameter as `GET /journal/entries/summary` so the window is measured in the user's day.
The client cannot compute it from `GET /dreams`, which carries no analysis information, and pushing the predicate client-side would let it drift from this decision.

This stance is expected to be inherited by later module widgets rather than being local to dreams.
A future reader will read "no counts anywhere" and "newest, not oldest" as oversights and helpfully fix them; that is what this record exists to prevent.
