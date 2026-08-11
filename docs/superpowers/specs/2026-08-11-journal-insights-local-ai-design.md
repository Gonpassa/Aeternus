# Journal Insights (Local AI) — Design

## Status

Brainstorm approved.
Not yet scheduled against the phase plan's exact number — see "Phase placement" below.

## Problem

Journal entries are personal.
Any AI feature that reads them must never send their content to a third-party cloud AI provider.
At the same time, the Nee.3 web app itself may be deployed remotely (e.g. Fly.io), so "local" cannot simply mean "runs on the server."
This design covers a journal feature that lets the user get AI-generated insights about their entries, and have an AI conversation across a set of entries, while guaranteeing entry content only ever reaches two places: the user's own backend/database, and a model process running on the user's own machine.

## Key insight

The AI call is made **client-side**, from the browser tab, not from the Nee.3 backend.
A browser tab always runs on the user's own machine regardless of where the web app is hosted, so it can call `http://localhost:11434` (a locally-running Ollama server) directly.
This resolves the apparent tension between "the app is a hosted web app" and "the model must be local" — no separate script or desktop app is needed.

## Scope

Two user-facing capabilities, both manually triggered (no passive/background AI activity):

1. **Insights** — user picks a date range (week/month/custom); the app summarizes feelings/outlook across the entries in that range.
2. **Chat across entries** — user selects a set of entries (defaulting from a date range, then adjustable by hand) and has an open-ended conversation about them.

Both are ephemeral: results and chat history live only in browser memory for the session and are not persisted to the backend or any storage. Nothing new is added to the data model.

## Architecture

```
Browser (client)
 ├─ Journal API calls  → Nee.3 backend → MongoDB   (existing, unchanged)
 └─ AI calls           → http://localhost:11434    (new, direct, client-only)
```

- Journal entries are fetched exactly as they already are for the Journal module (Phase 4), via the existing Journal API and TanStack Query hooks.
- The AI call is a separate, parallel path: the browser calls a locally-running Ollama server directly over `fetch`, bypassing the Nee.3 backend entirely.
- The Nee.3 backend requires **no changes** to support this feature. It never sees the prompt, the model's response, or that an AI call happened at all.

This split keeps the trust boundary simple: entry content goes to the user's own DB (already trusted) and to a process the user runs on their own machine. It never goes to the Nee.3 backend for AI purposes, and never to a third-party API.

## Module structure

New client-only module, `client/src/modules/journal-insights/`, following the existing modules-are-independent convention:

- `ollamaClient.ts` — thin fetch wrapper around the Ollama HTTP API (`/api/generate` for one-shot insights, `/api/chat` for multi-turn). Host and model name are read from settings; the client has no other dependency on the rest of the app.
- `InsightsPanel/` — date-range picker (week/month/custom) → loads entries in range via existing Journal query hooks → builds a summarization prompt → renders the model's response. One-shot; cleared on navigation away.
- `ChatPanel/` — manual entry multi-select, pre-seeded from a date range and then adjustable → opens a conversational thread. Selected entries are loaded once as context at the start of the chat; subsequent turns are normal chat messages. History lives in component state only.
- `OllamaSettings/` — host URL and model name, defaulting to `http://localhost:11434` and a documented default model. Persisted in `localStorage`, not the backend, since this is a local-machine preference rather than account data. Includes a connection health-check that surfaces a clear "Ollama not detected — run `ollama serve`" state instead of failing silently.

No backend work is required beyond what the Journal module (Phase 4) already provides.

## Setup requirement (operational, not code)

The user must:
1. Have Ollama installed and running locally (`ollama serve`).
2. Set `OLLAMA_ORIGINS` to include the Nee.3 app's origin, since the browser's calls to `localhost:11434` are cross-origin from the app's own origin.

This gets a short setup note in the README, alongside the existing local Postgres setup note.

## Error handling

- Ollama unreachable at the configured host → inline, actionable error message (not a silent failure or generic error).
- Selected entries exceed the model's context window → truncate the oldest entries and show a visible note that truncation occurred, rather than erroring out.

## Testing

- Unit tests for prompt construction (given a set of entries, the prompt built from them) and for `ollamaClient.ts` against a mocked `fetch`.
- No automated test can exercise a real local model in CI. Functional verification is manual, against a real running Ollama instance.

## Phase placement

This is a new, standalone phase — a distinct local-AI subsystem with its own setup/config concerns, not folded into the Journal module itself. It should be inserted into the README's phase plan after Phase 4 (Journal) and before the current Phase 5 (Structured writing), renumbering the phases that follow.
This renumbering is a follow-up edit to `README.md` to make when this phase is actually scheduled for implementation — out of scope for this design doc itself.

## Explicitly out of scope

- Passive/background insight generation (the user rejected this in favor of manual triggers).
- Persisting insights or chat history to the backend.
- Any cloud/third-party AI provider path for journal content.
- In-browser (WebGPU/WASM) model execution — Ollama was the chosen runtime; this can be revisited later if it becomes a real constraint (e.g. users without Ollama installed).
