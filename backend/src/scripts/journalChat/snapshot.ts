import { mkdir, readFile, rename, writeFile } from 'fs/promises';
import os from 'os';
import path from 'path';
import sanitizeHtml from 'sanitize-html';

export interface JournalEntry {
  date: string;
  title: string;
  mood: string;
  emotion: string | null;
  text: string;
}

export interface JournalSnapshot {
  pulledAt: string;
  entries: JournalEntry[];
}

// Lives outside the repo on purpose, so it can't be committed or picked up by tooling
// that walks the working tree.
export const snapshotPath = (): string =>
  process.env.JOURNAL_SNAPSHOT_PATH ??
  path.join(os.homedir(), '.aeternus', 'journal-snapshot.json');

export const htmlToText = (html: string): string =>
  sanitizeHtml(
    html
      .replace(/<li[^>]*>/gi, '<li>- ')
      .replace(/<br\s*\/?>|<\/(p|li|h[1-6]|blockquote)>/gi, (tag) => `${tag}\n`),
    { allowedTags: [], allowedAttributes: {} },
  )
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, '&')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

export const writeSnapshot = async (
  snapshot: JournalSnapshot,
  filePath: string = snapshotPath(),
): Promise<void> => {
  await mkdir(path.dirname(filePath), { recursive: true, mode: 0o700 });
  const tempPath = `${filePath}.tmp`;
  await writeFile(tempPath, JSON.stringify(snapshot), { mode: 0o600 });
  await rename(tempPath, filePath);
};

export const readSnapshot = async (filePath: string = snapshotPath()): Promise<JournalSnapshot> => {
  const raw = await readFile(filePath, 'utf8').catch(() => {
    throw new Error(`No journal snapshot at ${filePath}. Run "npm run journal:pull" first.`);
  });
  return JSON.parse(raw) as JournalSnapshot;
};
