import { FormEvent, FormEventHandler, useEffect, useRef, useState } from 'react';
import { format, parse } from 'date-fns';
import type { CreateEntryRequest, Entry, PrimaryMood, SpecificEmotion } from '@nee3/shared-types';
import { useEntryByDate } from '../../api/journalHooks.ts';
import { MoodPicker } from '../MoodPicker/MoodPicker.tsx';
import { RichTextEditor } from '../RichTextEditor/RichTextEditor.tsx';
import { Button } from '../../../../components/ui/Button/Button.tsx';
import { Calendar } from '../../../../components/ui/Calendar/Calendar.tsx';
import { Card } from '../../../../components/ui/Card/Card.tsx';
import { ConfirmDialog } from '../../../../components/ui/ConfirmDialog/ConfirmDialog.tsx';
import { FieldLabel } from '../../../../components/ui/FieldLabel/FieldLabel.tsx';
import { Input } from '../../../../components/ui/Input/Input.tsx';
import { Stack } from '../../../../components/ui/Stack/Stack.tsx';
import { Text } from '../../../../components/ui/Text/Text.tsx';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '../../../../components/ui/Popover/Popover.tsx';
import { VisuallyHidden } from '../../../../components/ui/VisuallyHidden/VisuallyHidden.tsx';
import styles from './EntryForm.module.css';

const todayIsoDate = (): string => new Date().toISOString().slice(0, 10);
const parseIsoDate = (iso: string): Date => parse(iso, 'yyyy-MM-dd', new Date());

export interface EntryFormProps {
  initialEntry?: Entry;
  onSubmit: (input: CreateEntryRequest, existingEntryId?: number) => Promise<void>;
  onDiscard?: () => void;
  onDelete?: () => void | Promise<void>;
}

export function EntryForm({ initialEntry, onSubmit, onDiscard, onDelete }: EntryFormProps) {
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

  const isDirty =
    date !== (initialEntry?.date ?? todayIsoDate()) ||
    title !== (initialEntry?.title ?? '') ||
    primaryMood !== (initialEntry?.primaryMood ?? null) ||
    specificEmotion !== (initialEntry?.specificEmotion ?? null) ||
    content !== (initialEntry?.content ?? '');

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

  const handleDiscard = () => {
    // A blocking native confirm is the deliberate choice here: discarding is destructive and
    // rare enough that a custom dialog component isn't warranted just for this one call site.
    // eslint-disable-next-line no-alert
    if (isDirty && !window.confirm('Discard this entry? Unsaved changes will be lost.')) {
      return;
    }
    onDiscard?.();
  };

  return (
    <Card
      as="form"
      variant="railed"
      // Card's props are typed against its div-rendering default; `as="form"` changes the
      // rendered element at runtime but not the typed handler signature, hence the cast.
      onSubmit={handleSubmit as unknown as FormEventHandler<HTMLDivElement>}
      display="flex"
      flexDirection="column"
      gap="4"
      maxW="2xl"
    >
      {existingEntryId && !initialEntry && (
        <Card variant="default" padding="none" position="relative">
          <div className={styles.collisionRail} aria-hidden="true" />
          <Text px="3" py="2" variant="eyebrow" color="rust">
            An entry already exists for this date &mdash; editing it instead.
          </Text>
        </Card>
      )}
      <FieldLabel eyebrow htmlFor="entry-date">
        Date
        <Popover
          open={datePopoverOpen}
          onOpenChange={(details) => setDatePopoverOpen(details.open)}
        >
          <PopoverTrigger asChild>
            <Button
              id="entry-date"
              type="button"
              variant="outline"
              justifyContent="flex-start"
              fontFamily="body"
              textTransform="none"
              w="fit-content"
              disabled={Boolean(initialEntry)}
            >
              {format(parseIsoDate(date), 'MMM d, yyyy')}
            </Button>
          </PopoverTrigger>
          <PopoverContent w="auto" borderColor="line" bg="paperCard" p="2">
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
      </FieldLabel>
      <FieldLabel display="block" position="relative" htmlFor="entry-title">
        <VisuallyHidden>Title</VisuallyHidden>
        <Input
          id="entry-title"
          variant="title"
          placeholder="Give the page a title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
        />
      </FieldLabel>
      <MoodPicker
        primaryMood={primaryMood}
        specificEmotion={specificEmotion}
        onChange={({ primaryMood: p, specificEmotion: s }) => {
          setPrimaryMood(p);
          setSpecificEmotion(s);
        }}
      />

      <RichTextEditor value={content} onChange={setContent} placeholder="Write today's entry..." />

      {error && <Text variant="error">{error}</Text>}

      <Stack justify="flex-end" gap="3" mt="2">
        {initialEntry ? (
          <ConfirmDialog
            trigger={
              <Button
                type="button"
                variant="outline"
                borderColor="rust"
                color="rust"
                _hover={{ bg: 'rust/5' }}
              >
                Delete
              </Button>
            }
            title="Delete this entry?"
            description="This action cannot be undone."
            confirmLabel="Delete"
            destructive
            onConfirm={() => onDelete?.()}
          />
        ) : (
          <Button type="button" variant="ghost" onClick={handleDiscard}>
            Discard
          </Button>
        )}
        <Button type="submit">Save entry</Button>
      </Stack>
    </Card>
  );
}
