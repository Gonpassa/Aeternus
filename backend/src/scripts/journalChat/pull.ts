import { Client } from 'pg';
import { htmlToText, JournalEntry, snapshotPath, writeSnapshot } from './snapshot';

const LOOPBACK_HOSTS = ['localhost', '127.0.0.1', '[::1]'];

// Production is only reachable through `fly proxy`, and that connection is plaintext
// up to the proxy, so anything other than loopback is a mistake.
export const assertLoopbackUrl = (url: string): void => {
  if (!LOOPBACK_HOSTS.includes(new URL(url).hostname)) {
    throw new Error('JOURNAL_SOURCE_URL must point at localhost, through a `fly proxy` tunnel.');
  }
};

interface EntryRow {
  date: string;
  title: string;
  primary_mood: string;
  specific_emotion: string | null;
  content: string;
}

const pull = async (): Promise<void> => {
  const url = process.env.JOURNAL_SOURCE_URL;
  if (!url) throw new Error('Set JOURNAL_SOURCE_URL. See docs/journal-chat.md.');
  assertLoopbackUrl(url);

  const client = new Client({
    connectionString: url,
    options: '-c default_transaction_read_only=on',
  });
  await client.connect();
  try {
    const username = process.env.JOURNAL_USERNAME;
    const users = await client.query<{ id: number }>(
      username ? 'SELECT id FROM users WHERE username = $1' : 'SELECT id FROM users',
      username ? [username] : [],
    );
    const user = users.rows[0];
    if (!user || users.rows.length > 1) {
      throw new Error(
        `Expected exactly one user, found ${users.rows.length}. Set JOURNAL_USERNAME to choose.`,
      );
    }

    const { rows } = await client.query<EntryRow>(
      `SELECT date::text AS date, title, primary_mood, specific_emotion, content
       FROM entries WHERE user_id = $1 ORDER BY date`,
      [user.id],
    );
    const entries: JournalEntry[] = rows.map((row) => ({
      date: row.date,
      title: row.title,
      mood: row.primary_mood,
      emotion: row.specific_emotion,
      text: htmlToText(row.content),
    }));

    await writeSnapshot({ pulledAt: new Date().toISOString(), entries });
    // Counts and dates only: this output must stay free of entry content.
    // eslint-disable-next-line no-console
    console.log(
      `Saved ${entries.length} entries (${entries[0]?.date ?? '-'} to ${entries.at(-1)?.date ?? '-'}) to ${snapshotPath()}`,
    );
  } finally {
    await client.end();
  }
};

if (require.main === module) {
  pull().catch((err: Error) => {
    // eslint-disable-next-line no-console
    console.error(err.message);
    process.exit(1);
  });
}
