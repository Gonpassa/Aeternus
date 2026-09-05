# Recovery buffer is client-only, same-browser, never server-persisted

The journal entry form needed a way to survive a refresh or an interrupted session without losing unsaved input.
We considered persisting this in-progress state server-side (a lightweight draft record), which would let a user recover their work on a different device or browser.
We chose `localStorage` instead: the recovery buffer never leaves the browser it was written in, and no new backend entity, schema, or endpoint exists for it.

This was a deliberate trade against cross-device continuity, which the app's personal, multi-device usage pattern would otherwise motivate.
The reasons: it keeps the feature from creating a de-facto "draft" domain concept, which the `Entry` glossary term explicitly rejects (see **Recovery buffer** in `CONTEXT.md`); it avoids new API surface and migrations for what is meant to be a transient safety net, not a feature; and it keeps the buffer's lifetime tied to the one browser session where the user is actually mid-keystroke, which is the only case this problem was reported for.

If cross-device recovery is wanted later, it should be scoped as its own decision rather than an extension of this one, since it reopens the "is this a draft" question this ADR sidesteps.
