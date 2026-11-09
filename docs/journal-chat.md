# Private journal chat

Talk to a model running on this machine about your journal, from the terminal.
It is a standalone tool, not part of the deployed app and not the Phase 10 AI work.

## How it stays private

- `journal:pull` is the only step that touches the network, and only through your own encrypted `fly proxy` tunnel, with the database session set to read-only.
- `journal:chat` reads only the local snapshot and holds no database credentials.
- The model address is fixed to `127.0.0.1:11434`, and `OLLAMA_HOST` is ignored.
- Ollama cloud models are refused, because they are called like local models but run on Ollama's servers.
- Conversations live in memory and are gone when the program exits.

The snapshot at `~/.aeternus/journal-snapshot.json` is plain text, readable only by your macOS account.
Keep FileVault on, since it is what protects the file at rest.
Delete the file whenever you want the local copy gone.

## Pull your entries

In one terminal, open the tunnel and leave it running:

```sh
fly proxy 5433:5432 -a aeternus-db
```

In a second terminal, from the repo root, using the same credentials and database name as `docs/data-migration-runbook.md`:

```sh
read -rs JOURNAL_SOURCE_URL && export JOURNAL_SOURCE_URL
npm run journal:pull
unset JOURNAL_SOURCE_URL
```

`read -rs` waits for you to paste `postgres://<user>:<password>@localhost:5433/<production-db-name>` without echoing it or saving it to shell history.
If the database holds more than one user, also set `JOURNAL_USERNAME`.
Stop the tunnel afterwards, then pull again whenever you want newer entries.

## Chat

With Ollama running:

```sh
npm run journal:chat
```

Type `exit` or press Ctrl-D to leave.
The dim lines in brackets show what the model looked up.
The default model is `qwen3.6:27b`; set `JOURNAL_CHAT_MODEL` to use another local model that supports tools.

## Limits

Search matches literal words, so the model has to guess related words for a theme like loneliness.
Only the journal is included, not dreams or notes.
