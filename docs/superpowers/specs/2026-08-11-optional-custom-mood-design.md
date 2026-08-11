# Optional, custom specific emotion — design

## Context

Phase 4a shipped the journal entry form with a two-level mood picker: a required primary mood (happy/calm/sad/anxious/angry) and a required specific emotion, chosen from a fixed set of 4 per primary mood, defined in `MOOD_TAXONOMY` (`packages/shared-types/src/index.ts`).

This change makes the specific emotion optional, and lets the user type a custom emotion instead of picking one of the 4 fixed options.

## Data model

`specific_emotion` is currently a Postgres enum column (`specificEmotionEnum`, `backend/src/db/schema.ts`), `not null`. Free-text custom values can't live in an enum, so the column becomes plain nullable `text`.

- `backend/src/db/schema.ts`: drop `specificEmotionEnum`; change `specificEmotion: specificEmotionEnum('specific_emotion').notNull()` to `specificEmotion: text('specific_emotion')` (nullable).
- Generate a Drizzle migration (`npm run db:generate` in `backend/`) for the enum-to-text column change.
- `packages/shared-types/src/index.ts`: `SpecificEmotion` becomes `string` (drop the 20-value literal union). `Entry.specificEmotion` and `CreateEntryRequest.specificEmotion` become `string | null`. `MOOD_TAXONOMY` keeps its 4 suggested emotions per primary mood, typed `Record<PrimaryMood, string[]>`, for rendering the fixed buttons only — it's no longer a validation source.

`primaryMood` is unaffected: still a required enum, still one of the 5 fixed values.

## Backend validation

`backend/src/modules/journal/validation.ts`:

- `primaryMood`: unchanged, still required, still must be one of the 5 values.
- `specificEmotion`: becomes optional. If `undefined`/`null`/omitted, valid. If present, must be a non-empty string after trimming (reject whitespace-only). No longer checked against `MOOD_TAXONOMY` — any non-empty string is accepted, since custom text is allowed.
- Store trimmed value, or `null` if not provided.

## Frontend — MoodPicker

`client/src/modules/journal/components/MoodPicker/MoodPicker.tsx`:

- Primary mood row: unchanged.
- Specific emotion row (shown once a primary mood is picked): the 4 fixed buttons render as today, plus a 5th control — a text `<input>` with placeholder `Custom`.
- State handling (mutually exclusive, "last interaction wins"):
  - Clicking a fixed emotion button sets `specificEmotion` to that value and clears the custom input's displayed text.
  - Typing in the custom input sets `specificEmotion` to the typed value (trimmed), or `null` if the input is emptied, and visually deselects any fixed button (`aria-checked=false` on all four).
- The custom input needs its own bit of local state to control its displayed text (cleared when a fixed button is clicked, populated when `specificEmotion` doesn't match any of the 4 fixed values for the current primary mood — e.g. when editing an existing entry that has a custom emotion).
- `MoodPickerProps.specificEmotion` type: `string | null` (was `SpecificEmotion | null`, now the same thing since `SpecificEmotion` is `string`).

## Frontend — EntryForm

`client/src/modules/journal/components/EntryForm/EntryForm.tsx`:

- Save guard (`handleSubmit`) changes from `if (!primaryMood || !specificEmotion)` to `if (!primaryMood)`. A primary mood is still required to save; the specific emotion is not.

## Frontend — EntryView

`client/src/modules/journal/components/EntryView/EntryView.tsx`:

- Currently always renders `{MOOD_LABEL[entry.primaryMood]} · {entry.specificEmotion}`. Change to only render the `· {entry.specificEmotion}` part when `entry.specificEmotion` is non-null/non-empty, so entries without a specific emotion don't show a dangling separator.

## Testing

- `MoodPicker.test.tsx`: update/add cases for the custom input (typing sets value and deselects fixed buttons, clicking a fixed button clears the custom input), and for optional selection (no specific emotion selected is valid picker state).
- Backend `validation.ts` tests (if present) or new ones: specificEmotion omitted/null is valid; whitespace-only string is rejected; arbitrary custom string is accepted.
- `EntryForm` test coverage for the save guard change (submits successfully with only a primary mood set).

## Out of scope

- No change to primary mood being required.
- No change to the 4 suggested emotions shown per primary mood (`MOOD_TAXONOMY` values stay as-is, just retyped).
- No dedup/normalization of custom emotion text (e.g. case-folding) — stored as typed, trimmed.
