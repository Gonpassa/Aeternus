# Adopt React Hook Form + Zod for all forms, with split error handling

All 4 existing forms (login, register, `EntryForm`) are hand-rolled: per-field `useState`, manual `onSubmit` handlers, no schema validation, and - in `EntryForm` - manual dirty-diffing against initial values via a `useRef`.
This duplicates the same field/error/dirty plumbing in every form, and the coming Structured Writing, Calendar, and AI Learning phases will each add more forms on top of it.

We decided to migrate all forms to React Hook Form, with Zod (`@hookform/resolvers`) as the schema-validation layer.
Because every input in the design system (`client/src/atoms/`) is a controlled Chakra component, each field binds through RHF's `Controller`/`useController` rather than native `register()` - Chakra components don't expose a raw DOM ref RHF can register directly.
This binding is centralized in one reusable `atoms/FormField` component wrapping `Controller`, rather than wiring `Controller` ad hoc per field per form.
`FormField` covers `Input` only for now; a `Select`/other variant gets added the day a form actually needs one, not speculatively.

Composite fields register as their constituent RHF fields, not one bundled object: `MoodPicker`'s `primaryMood` and `specificEmotion` register as two independent fields (matching `CreateEntryRequest`/`UpdateEntryRequest`'s shape and letting each carry its own validation/error), rather than one `Controller` emitting `{ primaryMood, specificEmotion }` as a single value.

Validation surfaces on blur first, then live on change once a field has an error (`mode: 'onBlur'`, `reValidateMode: 'onChange'`) - quiet while a field is untouched, immediate feedback while fixing a flagged one.

`EntryForm`'s existing collision-prefill (auto-filling title/mood/content when the chosen date matches an existing entry) moves from manual state + a "still loading" ref to RHF's `reset()`, called with the loaded entry as the new baseline once a collision is confirmed.
Dirty-tracking (`formState.isDirty`) is measured against that baseline afterward, not against the form's original blank values - once a collision is loaded, the form is conceptually "editing an existing entry," not "filling a blank one."

Failures split by whether they're actionable at a specific field. Expected, field-attributable failures (duplicate username on register, invalid credentials on login) stay inline via RHF's `setError`, next to the field the user needs to fix. Everything else (network errors, unexpected 5xxs) is caught once, globally, by an Axios response interceptor in `client/src/api/client.ts` and surfaced as a toast via Chakra v3's `createToaster`/`<Toaster />` - this also catches calls like `useAuth().login()` that aren't wrapped in a TanStack Query mutation, since the interceptor sits on the one chokepoint every request already passes through.

## Status

Accepted.

## Considered options

Keep the current per-field `useState` pattern and just add Zod validation on top of it. Rejected: doesn't remove the duplicated field/error/dirty plumbing driving the migration in the first place, and doesn't help the Controller-binding problem Chakra's controlled components create.

Route all failures (including duplicate username, invalid credentials) through the global toast. Rejected: those failures are actionable right where the user is already looking - a bottom-of-screen toast is worse UX than today's inline message for exactly the cases where the user needs to correct a specific field.

Bundle `MoodPicker`'s value as one object field via a single `Controller`. Rejected: loses per-field validation/error granularity (`primaryMood` required, `specificEmotion` optional) and doesn't match the two-key shape the API already expects.
