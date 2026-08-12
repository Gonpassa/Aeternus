import { FormEvent, useEffect, useRef, useState } from 'react';
import { format, parse } from 'date-fns';
import type { CreateEntryRequest, Entry, PrimaryMood, SpecificEmotion } from '@nee3/shared-types';
import { useEntryByDate } from '../../api/journalHooks.ts';
import { MoodPicker } from '../MoodPicker/MoodPicker.tsx';
import { RichTextEditor } from '../RichTextEditor/RichTextEditor.tsx';
import { Button } from '../../../../components/ui/button.tsx';
import { Calendar } from '../../../../components/ui/calendar.tsx';
import { Popover, PopoverContent, PopoverTrigger } from '../../../../components/ui/popover.tsx';

const todayIsoDate = (): string => new Date().toISOString().slice(0, 10);
const parseIsoDate = (iso: string): Date => parse(iso, 'yyyy-MM-dd', new Date());

export interface EntryFormProps {
  initialEntry?: Entry;
  onSubmit: (input: CreateEntryRequest, existingEntryId?: number) => Promise<void>;
}

export function EntryForm({ initialEntry, onSubmit }: EntryFormProps) {
  const [date, setDate] = useState(initialEntry?.date ?? todayIsoDate());
  const [datePopoverOpen, setDatePopoverOpen] = useState(false);
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
  const { data: collidingEntry, isLoading: collisionLookupLoading } =
    useEntryByDate(collisionLookupDate);
  // Tracks whether the form's fields are currently populated from a fetched collision,
  // so we only clear them once that collision is confirmed gone - never merely because
  // the lookup is loading or resolved to "no collision" for data the user typed themselves.
  const prefilledFromCollisionId = useRef<number | null>(null);

  useEffect(() => {
    if (collisionLookupLoading) {
      // The collision lookup for the current date is still in flight; `collidingEntry`
      // is momentarily `undefined` here even though no collision has been ruled out yet.
      // Don't clear user-typed data based on this transient state.
      return;
    }
    if (collidingEntry) {
      prefilledFromCollisionId.current = collidingEntry.id;
      setTitle(collidingEntry.title);
      setPrimaryMood(collidingEntry.primaryMood);
      setSpecificEmotion(collidingEntry.specificEmotion);
      setContent(collidingEntry.content);
    } else if (!initialEntry && prefilledFromCollisionId.current !== null) {
      prefilledFromCollisionId.current = null;
      setTitle('');
      setPrimaryMood(null);
      setSpecificEmotion(null);
      setContent('');
    }
  }, [collidingEntry, collisionLookupLoading, initialEntry]);

  const existingEntryId = initialEntry?.id ?? collidingEntry?.id;

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    if (!primaryMood) {
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
        <Popover open={datePopoverOpen} onOpenChange={setDatePopoverOpen}>
          <PopoverTrigger asChild>
            <Button
              id="entry-date"
              type="button"
              variant="outline"
              className="w-fit justify-start font-sans normal-case"
              disabled={Boolean(initialEntry)}
            >
              {format(parseIsoDate(date), 'MMM d, yyyy')}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto border-line bg-paper-card p-2" align="start">
            <Calendar
              mode="single"
              selected={parseIsoDate(date)}
              onSelect={(selected) => {
                if (!selected) return;
                setDate(format(selected, 'yyyy-MM-dd'));
                setDatePopoverOpen(false);
              }}
            />
          </PopoverContent>
        </Popover>
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
      <Button type="submit">Save entry</Button>
    </form>
  );
}
