import { FormEvent, useEffect, useState } from 'react';
import type { CreateEntryRequest, Entry, PrimaryMood, SpecificEmotion } from '@nee3/shared-types';
import { useEntryByDate } from '../../api/journalHooks.ts';
import { MoodPicker } from '../MoodPicker/MoodPicker.tsx';
import { RichTextEditor } from '../RichTextEditor/RichTextEditor.tsx';

const todayIsoDate = (): string => new Date().toISOString().slice(0, 10);

export interface EntryFormProps {
  initialEntry?: Entry;
  onSubmit: (input: CreateEntryRequest, existingEntryId?: number) => Promise<void>;
}

export function EntryForm({ initialEntry, onSubmit }: EntryFormProps) {
  const [date, setDate] = useState(initialEntry?.date ?? todayIsoDate());
  const [title, setTitle] = useState(initialEntry?.title ?? '');
  const [primaryMood, setPrimaryMood] = useState<PrimaryMood | null>(
    initialEntry?.primaryMood ?? null,
  );
  const [specificEmotion, setSpecificEmotion] = useState<SpecificEmotion | null>(
    initialEntry?.specificEmotion ?? null,
  );
  const [content, setContent] = useState(initialEntry?.content ?? '');
  const [error, setError] = useState<string | null>(null);

  // Only look up by-date collisions in create mode; an edit route already has its entry.
  const collisionLookupDate = initialEntry ? null : date;
  const { data: collidingEntry } = useEntryByDate(collisionLookupDate);

  useEffect(() => {
    if (collidingEntry) {
      setTitle(collidingEntry.title);
      setPrimaryMood(collidingEntry.primaryMood);
      setSpecificEmotion(collidingEntry.specificEmotion);
      setContent(collidingEntry.content);
    }
  }, [collidingEntry]);

  const existingEntryId = initialEntry?.id ?? collidingEntry?.id;

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    if (!primaryMood || !specificEmotion) {
      setError('Please choose a mood.');
      return;
    }
    try {
      await onSubmit({ date, title, primaryMood, specificEmotion, content }, existingEntryId);
    } catch {
      setError('Could not save this entry.');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex max-w-2xl flex-col gap-4">
      {existingEntryId && !initialEntry && (
        <p className="font-mono text-xs uppercase text-rust">
          An entry already exists for this date &mdash; editing it instead.
        </p>
      )}
      <label className="flex flex-col gap-1 font-mono text-xs uppercase" htmlFor="entry-date">
        Date
        <input
          id="entry-date"
          type="date"
          className="border border-line bg-paper-card p-2 font-sans normal-case"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          disabled={Boolean(initialEntry)}
          required
        />
      </label>
      <label className="flex flex-col gap-1 font-mono text-xs uppercase" htmlFor="entry-title">
        Title
        <input
          id="entry-title"
          className="border border-line bg-paper-card p-2 font-sans normal-case"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
        />
      </label>
      <MoodPicker
        primaryMood={primaryMood}
        specificEmotion={specificEmotion}
        onChange={({ primaryMood: p, specificEmotion: s }) => {
          setPrimaryMood(p);
          setSpecificEmotion(s);
        }}
      />
      <RichTextEditor value={content} onChange={setContent} placeholder="Write today's entry..." />
      {error && <p className="text-rust">{error}</p>}
      <button type="submit" className="bg-ink-blue p-2 font-mono text-xs uppercase text-paper">
        Save entry
      </button>
    </form>
  );
}
