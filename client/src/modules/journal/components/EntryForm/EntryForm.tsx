import { useEffect, useState, type FormEventHandler } from 'react';
import { format, parse } from 'date-fns';
import { Controller, useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import type { CreateEntryRequest, Entry } from '@nee3/shared-types';
import { useEntryByDate } from '../../api/journalHooks.ts';
import { useExternalChange } from '../../hooks/useExternalChange.ts';
import { useRecoveryBuffer } from '../../hooks/useRecoveryBuffer.ts';
import { MoodPicker } from '../MoodPicker/MoodPicker.tsx';
import { RichTextEditor } from '../RichTextEditor/RichTextEditor.tsx';
import { Button } from '../../../../atoms/Button/Button.tsx';
import { Calendar } from '../../../../atoms/Calendar/Calendar.tsx';
import { Card } from '../../../../atoms/Card/Card.tsx';
import { Dialog } from '../../../../atoms/Dialog/Dialog.tsx';
import { useDialogState } from '../../../../atoms/Dialog/useDialogState.ts';
import { FieldLabel } from '../../../../atoms/FieldLabel/FieldLabel.tsx';
import { FormField } from '../../../../atoms/FormField/FormField.tsx';
import { Stack } from '../../../../atoms/Stack/Stack.tsx';
import { Text } from '../../../../atoms/Text/Text.tsx';
import { Popover, PopoverContent, PopoverTrigger } from '../../../../atoms/Popover/Popover.tsx';
import { VisuallyHidden } from '../../../../atoms/VisuallyHidden/VisuallyHidden.tsx';
import { entrySchema, type EntryFormValues, type EntryFormOutput } from './EntryForm.utils.ts';
import styles from './EntryForm.module.css';

const todayIsoDate = (): string => new Date().toISOString().slice(0, 10);
const parseIsoDate = (iso: string): Date => parse(iso, 'yyyy-MM-dd', new Date());

export interface EntryFormProps {
  initialEntry?: Entry;
  // EntryForm decides internally (via `initialEntry` or a same-date collision lookup)
  // whether a Save creates or updates an Entry - callers supply both operations and
  // never need to know which one applies to the current Save.
  onCreate?: (input: CreateEntryRequest) => Promise<void>;
  onUpdate?: (id: number, input: CreateEntryRequest) => Promise<void>;
  onDiscard?: () => void;
  onDelete?: () => void | Promise<void>;
}

const defaultValuesFor = (initialEntry: Entry | undefined): EntryFormValues => ({
  date: initialEntry?.date ?? todayIsoDate(),
  title: initialEntry?.title ?? '',
  primaryMood: initialEntry?.primaryMood ?? null,
  specificEmotion: initialEntry?.specificEmotion ?? null,
  content: initialEntry?.content ?? '',
});

const recoveryValuesEqual = (a: EntryFormValues, b: EntryFormValues): boolean =>
  a.date === b.date &&
  a.title === b.title &&
  a.primaryMood === b.primaryMood &&
  a.specificEmotion === b.specificEmotion &&
  a.content === b.content;

export function EntryForm({
  initialEntry,
  onCreate,
  onUpdate,
  onDiscard,
  onDelete,
}: EntryFormProps) {
  const [datePopoverOpen, setDatePopoverOpen] = useState(false);
  const deleteDialog = useDialogState();
  const discardDialog = useDialogState();
  const conflictDialog = useDialogState();
  const [pendingRecoveryValues, setPendingRecoveryValues] = useState<EntryFormValues | null>(null);

  const {
    control,
    handleSubmit,
    reset,
    formState: { isDirty, isSubmitting },
  } = useForm<EntryFormValues, unknown, EntryFormOutput>({
    defaultValues: defaultValuesFor(initialEntry),
    resolver: zodResolver(entrySchema),
    mode: 'onBlur',
    reValidateMode: 'onChange',
  });
  const date = useWatch({ control, name: 'date' });
  const watchedValues = useWatch({ control }) as EntryFormValues;

  // Recovery buffer (see CONTEXT.md, ADR-0005): a same-browser-only, transient snapshot of
  // this in-progress Entry form, never itself a saved Entry. Keyed by the same identity the
  // form itself resolves to - `entryId` in edit mode, a fixed slot in create mode (there is
  // only ever one new-entry composition per browser, so no date-based re-keying is needed -
  // the date field is just one of the captured values, not part of the key).
  const recoveryKey = initialEntry ? `entry:${initialEntry.id}` : 'new';
  const recoveryBuffer = useRecoveryBuffer(recoveryKey);

  // Restore-on-mount: in create mode there's no server data to disagree with, so restore
  // silently. In edit mode, only restore silently if the buffer matches what the server
  // already has; a genuine mismatch is surfaced as a conflict dialog rather than resolved
  // automatically, since local unsaved input and the server's current version both being
  // real, disagreeing possibilities is exactly the case the user asked to decide themselves.
  useEffect(() => {
    const buffered = recoveryBuffer.read();
    if (!buffered) return;
    if (!initialEntry) {
      reset(buffered);
      return;
    }
    if (recoveryValuesEqual(buffered, defaultValuesFor(initialEntry))) {
      reset(buffered);
      return;
    }
    setPendingRecoveryValues(buffered);
    conflictDialog.openDialog();
    // Mount-only: this reconciles the buffer against the entry this instance was given,
    // once, the same way the collision-lookup reconciliation below only reacts to real
    // external changes rather than every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Persist every change once the user has actually touched the form - not on mount with
  // untouched defaults, which would just write back an empty/no-op buffer.
  useEffect(() => {
    if (!isDirty) return;
    recoveryBuffer.write(watchedValues);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isDirty, watchedValues]);

  // Only look up by-date collisions in create mode; an edit route already has its entry.
  const collisionLookupDate = initialEntry ? null : date;
  const { data: collidingEntry, isLoading: collisionLookupLoading } =
    useEntryByDate(collisionLookupDate);
  // Only a confirmed collision (fetch settled, one way or the other) should ever touch
  // the form - never a transient `undefined` while the lookup for the current date is
  // still in flight, which would otherwise clear data the user just typed.
  useExternalChange(
    collidingEntry ?? null,
    (nextCollidingEntry) => {
      if (nextCollidingEntry) {
        // A same-date saved Entry always wins over a restored recovery buffer - this branch
        // only runs in create mode, so the buffer being superseded is unambiguously the
        // fixed 'new' one; clear it so it doesn't linger in localStorage for a draft that's
        // no longer reachable (its date now belongs to a saved Entry, not an in-progress one).
        recoveryBuffer.clear();
        reset({
          date,
          title: nextCollidingEntry.title,
          primaryMood: nextCollidingEntry.primaryMood,
          specificEmotion: nextCollidingEntry.specificEmotion,
          content: nextCollidingEntry.content,
        });
      } else if (!initialEntry) {
        reset({ date, title: '', primaryMood: null, specificEmotion: null, content: '' });
      }
    },
    {
      skip: collisionLookupLoading,
      isEqual: (a, b) => (a?.id ?? null) === (b?.id ?? null),
    },
  );

  const existingEntryId = initialEntry?.id ?? collidingEntry?.id;

  const onValid = async (values: EntryFormOutput) => {
    try {
      if (existingEntryId) {
        await onUpdate?.(existingEntryId, values);
      } else {
        await onCreate?.(values);
      }
      recoveryBuffer.clear();
    } catch {
      // Save failures aren't field-attributable here (there's no per-field validation path
      // for them, unlike login/register); the global toast interceptor in api/client.ts
      // already surfaced it - nothing more to do here.
    }
  };

  const handleDiscard = () => {
    if (isDirty) {
      discardDialog.openDialog();
      return;
    }
    recoveryBuffer.clear();
    onDiscard?.();
  };

  const confirmDiscard = () => {
    discardDialog.closeDialog();
    recoveryBuffer.clear();
    onDiscard?.();
  };

  const handleDelete = async () => {
    await onDelete?.();
    deleteDialog.closeDialog();
  };

  const keepRecoveredChanges = () => {
    if (pendingRecoveryValues) reset(pendingRecoveryValues);
    recoveryBuffer.clear();
    setPendingRecoveryValues(null);
    conflictDialog.closeDialog();
  };

  const keepSavedVersion = () => {
    recoveryBuffer.clear();
    setPendingRecoveryValues(null);
    conflictDialog.closeDialog();
  };

  return (
    <Card
      as="form"
      variant="railed"
      // Card's props are typed against its div-rendering default; `as="form"` changes the
      // rendered element at runtime but not the typed handler signature, hence the cast.
      onSubmit={handleSubmit(onValid) as unknown as FormEventHandler<HTMLDivElement>}
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
      <Controller
        control={control}
        name="date"
        render={({ field }) => (
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
                  {format(parseIsoDate(field.value), 'MMM d, yyyy')}
                </Button>
              </PopoverTrigger>
              <PopoverContent w="auto" borderColor="line" bg="paperCard" p="2">
                <Calendar
                  mode="single"
                  selected={parseIsoDate(field.value)}
                  onSelect={(selected) => {
                    if (!selected) return;
                    field.onChange(format(selected, 'yyyy-MM-dd'));
                    setDatePopoverOpen(false);
                  }}
                />
              </PopoverContent>
            </Popover>
          </FieldLabel>
        )}
      />
      <FormField
        control={control}
        name="title"
        label={<VisuallyHidden>Title</VisuallyHidden>}
        variant="title"
        placeholder="Give the page a title"
      />
      <MoodPicker control={control} />

      <Controller
        control={control}
        name="content"
        render={({ field }) => (
          <RichTextEditor
            value={field.value}
            onChange={field.onChange}
            placeholder="Write today's entry..."
          />
        )}
      />

      <Stack justify="flex-end" gap="3" mt="2">
        {initialEntry ? (
          <>
            <Button
              type="button"
              variant="outline"
              borderColor="rust"
              color="rust"
              _hover={{ bg: 'rust/5' }}
              onClick={deleteDialog.openDialog}
            >
              Delete
            </Button>
            <Dialog
              open={deleteDialog.open}
              onClose={deleteDialog.closeDialog}
              variant="small"
              role="alertdialog"
              header={{ title: 'Delete this entry?' }}
              footer={{
                secondary: { label: 'Cancel', onClick: deleteDialog.closeDialog },
                primary: { label: 'Delete', variant: 'destructive', onClick: handleDelete },
              }}
            >
              <Text fontFamily="body" color="inkSoft">
                This action cannot be undone.
              </Text>
            </Dialog>
          </>
        ) : (
          <>
            <Button type="button" variant="ghost" onClick={handleDiscard}>
              Discard
            </Button>
            <Dialog
              open={discardDialog.open}
              onClose={discardDialog.closeDialog}
              variant="small"
              role="alertdialog"
              header={{ title: 'Discard this entry?' }}
              footer={{
                secondary: { label: 'Cancel', onClick: discardDialog.closeDialog },
                primary: { label: 'Discard', variant: 'destructive', onClick: confirmDiscard },
              }}
            >
              <Text fontFamily="body" color="inkSoft">
                Unsaved changes will be lost.
              </Text>
            </Dialog>
          </>
        )}
        <Button type="submit" loading={isSubmitting}>
          Save entry
        </Button>
      </Stack>
      <Dialog
        open={conflictDialog.open}
        onClose={keepSavedVersion}
        variant="small"
        role="alertdialog"
        header={{ title: 'Unsaved changes found' }}
        footer={{
          secondary: { label: 'Use saved version', onClick: keepSavedVersion },
          primary: { label: 'Keep my changes', onClick: keepRecoveredChanges },
        }}
      >
        <Text fontFamily="body" color="inkSoft">
          You have unsaved changes to this entry from a previous session that differ from
          what&apos;s saved. Which version would you like to keep?
        </Text>
      </Dialog>
    </Card>
  );
}
