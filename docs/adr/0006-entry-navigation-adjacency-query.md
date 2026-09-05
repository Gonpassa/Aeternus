# Resolve entry next/previous navigation via an indexed date query, not the full entries list

The entry detail page (`/journal/$entryId`) needs to know its **chronological neighbor** entries to render Next/Previous navigation buttons.
The `/journal` list endpoint already fetches every entry for the user in one call, so reusing it looked like the free option.

We measured it instead: `listEntriesByUser` returns full, unqualified rows - including the rich-text `content` HTML column - with no summary projection.
At an estimated ~5,000 entries per user, that response runs into the tens of megabytes uncompressed.
The detail page also has no reliable path to that cache: it's commonly reached directly (bookmark, deep link, refresh) without the list route ever having been visited, so "reuse the list" would in practice mean "fetch the entire multi-megabyte list on every single entry view."

We instead extend `GET /entries/:id` to include `nextEntryId`/`previousEntryId`, computed via a query keyed on `(userId, date)` - already backed by that column pair's unique constraint - so the lookup cost stays effectively constant regardless of how many entries the user has.
