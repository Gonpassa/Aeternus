import type { Entry } from '@nee3/shared-types';
import { MOOD_DOT_CLASS, MOOD_LABEL } from '../../moodColors.ts';

export interface EntryViewProps {
  entry: Entry;
}

export function EntryView({ entry }: EntryViewProps) {
  return (
    <article className="mx-auto max-w-2xl border-l-2 border-dashed border-line pl-6">
      <p className="font-mono text-xs uppercase tracking-wide text-ink-soft">{entry.date}</p>
      <h1 className="font-display text-3xl font-semibold text-ink">{entry.title}</h1>
      <p className="mt-1 flex items-center gap-1.5 font-mono text-xs uppercase text-ink-soft">
        <span
          className={`h-2.5 w-2.5 rounded-full ${MOOD_DOT_CLASS[entry.primaryMood]}`}
          aria-hidden="true"
        />
        {MOOD_LABEL[entry.primaryMood]}
        {entry.specificEmotion && <> &middot; {entry.specificEmotion}</>}
      </p>
      <div
        className="entry-content font-body mt-6 text-[1.0625rem] text-ink"
        // The content injected via dangerouslySetInnerHTML is safe here specifically because
        // entry.content was sanitized server-side (allow-listed tags only, per
        // backend/src/modules/journal/sanitize.ts) before it was ever written to the database.
        dangerouslySetInnerHTML={{ __html: entry.content }}
      />
    </article>
  );
}
