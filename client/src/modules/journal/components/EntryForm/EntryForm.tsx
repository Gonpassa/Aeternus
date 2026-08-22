import { useEffect, useRef, useState, type FormEventHandler } from 'react';
import { format, parse } from 'date-fns';
import { Controller, useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import type { CreateEntryRequest, Entry } from '@nee3/shared-types';
import { useEntryByDate } from '../../api/journalHooks.ts';
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
  onSubmit: (input: CreateEntryRequest, existingEntryId?: number) => Promise<void>;
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

export function EntryForm({ initialEntry, onSubmit, onDiscard, onDelete }: EntryFormProps) {
  const [datePopoverOpen, setDatePopoverOpen] = useState(false);
  const deleteDialog = useDialogState();
  const discardDialog = useDialogState();

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
      reset({
        date,
        title: collidingEntry.title,
        primaryMood: collidingEntry.primaryMood,
        specificEmotion: collidingEntry.specificEmotion,
        content: collidingEntry.content,
      });
    } else if (!initialEntry && prefilledFromCollisionId.current !== null) {
      prefilledFromCollisionId.current = null;
      reset({ date, title: '', primaryMood: null, specificEmotion: null, content: '' });
    }
    // `reset` is stable and `date` is read fresh via `useWatch` above; including them
    // would re-run this on every keystroke in other fields (RHF re-renders on every
    // field change).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [collidingEntry, collisionLookupLoading, initialEntry]);

  const existingEntryId = initialEntry?.id ?? collidingEntry?.id;

  const onValid = async (values: EntryFormOutput) => {
    try {
      await onSubmit(values, existingEntryId);
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
    onDiscard?.();
  };

  const confirmDiscard = () => {
    discardDialog.closeDialog();
    onDiscard?.();
  };

  const handleDelete = async () => {
    await onDelete?.();
    deleteDialog.closeDialog();
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
    </Card>
  );
}
