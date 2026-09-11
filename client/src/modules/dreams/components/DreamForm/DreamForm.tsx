import { useEffect, useState, type FormEventHandler, type Ref } from 'react';
import { format } from 'date-fns';
import { Controller, useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import type { AnyExtension, Editor } from '@tiptap/react';
import type { CreateDreamRequest } from '@nee3/shared-types';
import { useRecoveryBuffer } from '../../hooks/useRecoveryBuffer.ts';
import { parseIsoDate } from '../../../../utils/isoDate.ts';
import { Button } from '../../../../atoms/Button/Button.tsx';
import { Calendar } from '../../../../atoms/Calendar/Calendar.tsx';
import { Card } from '../../../../atoms/Card/Card.tsx';
import { Dialog } from '../../../../atoms/Dialog/Dialog.tsx';
import { useDialogState } from '../../../../atoms/Dialog/useDialogState.ts';
import { FieldLabel } from '../../../../atoms/FieldLabel/FieldLabel.tsx';
import { Popover, PopoverContent, PopoverTrigger } from '../../../../atoms/Popover/Popover.tsx';
import { RichTextEditor } from '../../../../atoms/RichTextEditor/RichTextEditor.tsx';
import { Stack } from '../../../../atoms/Stack/Stack.tsx';
import { Text } from '../../../../atoms/Text/Text.tsx';
import { dreamSchema, type DreamFormValues, type DreamFormOutput } from './DreamForm.utils.ts';

const todayIsoDate = (): string => new Date().toISOString().slice(0, 10);

export interface DreamFormProps {
  onSubmit: (input: CreateDreamRequest) => Promise<void>;
  onDiscard?: () => void;
  // Presence switches the form to edit mode: prefilled from the given dream and with the
  // new-dream recovery buffer disabled (the server already holds the source of truth).
  initialValues?: DreamFormValues;
  submitLabel?: string;
  // Forwarded to the editor - the edit page adds the Anchor mark (see ADR-0007) so an
  // anchored narrative round-trips without dropping its marks.
  extraExtensions?: AnyExtension[];
  editorRef?: Ref<Editor | null>;
}

const defaultValuesFor = (): DreamFormValues => ({ date: todayIsoDate(), narrative: '' });

// Recovery buffer (see CONTEXT.md, ADR-0005), mirroring journal's EntryForm: a
// same-browser-only, transient snapshot of this in-progress dream recording. There is
// only ever one in-progress new-dream composition per browser, so a fixed 'new' slot is
// enough - no by-id or by-date keying, since edit mode opts out of the buffer entirely.
const RECOVERY_KEY = 'new';

export function DreamForm({
  onSubmit,
  onDiscard,
  initialValues,
  submitLabel = 'Save dream',
  extraExtensions,
  editorRef,
}: DreamFormProps) {
  const [datePopoverOpen, setDatePopoverOpen] = useState(false);
  const discardDialog = useDialogState();
  const recoveryBuffer = useRecoveryBuffer(RECOVERY_KEY);
  const isEditing = initialValues !== undefined;

  const {
    control,
    handleSubmit,
    reset,
    formState: { isDirty, isSubmitting },
  } = useForm<DreamFormValues, unknown, DreamFormOutput>({
    defaultValues: initialValues ?? defaultValuesFor(),
    resolver: zodResolver(dreamSchema),
    mode: 'onBlur',
    reValidateMode: 'onChange',
  });
  const watchedValues = useWatch({ control }) as DreamFormValues;

  // There's no server data to disagree with in create-only mode, so a buffer found on
  // mount is always restored silently - unlike journal's EntryForm, which also handles
  // an edit mode where a restored buffer can conflict with what the server has. Edit mode
  // here sidesteps that conflict by not using the buffer at all.
  useEffect(() => {
    if (isEditing) return;
    const buffered = recoveryBuffer.read();
    if (buffered) reset(buffered);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (isEditing || !isDirty) return;
    recoveryBuffer.write(watchedValues);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isEditing, isDirty, watchedValues]);

  const onValid = async (values: DreamFormOutput) => {
    try {
      await onSubmit(values);
      if (!isEditing) recoveryBuffer.clear();
    } catch {
      // Save failures aren't field-attributable here; the global toast interceptor in
      // api/client.ts already surfaced it - nothing more to do.
    }
  };

  const handleDiscard = () => {
    if (isDirty) {
      discardDialog.openDialog();
      return;
    }
    if (!isEditing) recoveryBuffer.clear();
    onDiscard?.();
  };

  const confirmDiscard = () => {
    discardDialog.closeDialog();
    if (!isEditing) recoveryBuffer.clear();
    onDiscard?.();
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
      <Controller
        control={control}
        name="date"
        render={({ field }) => (
          <FieldLabel eyebrow htmlFor="dream-date">
            Date
            <Popover
              open={datePopoverOpen}
              onOpenChange={(details) => setDatePopoverOpen(details.open)}
            >
              <PopoverTrigger asChild>
                <Button
                  id="dream-date"
                  type="button"
                  variant="outline"
                  justifyContent="flex-start"
                  fontFamily="body"
                  textTransform="none"
                  w="fit-content"
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

      <Controller
        control={control}
        name="narrative"
        render={({ field, fieldState }) => (
          <Stack direction="column" gap="1">
            <RichTextEditor
              ref={editorRef}
              value={field.value}
              onChange={field.onChange}
              placeholder="What happened in the dream?"
              extraExtensions={extraExtensions}
            />
            {fieldState.error && (
              <Text variant="formError" role="alert">
                {fieldState.error.message}
              </Text>
            )}
          </Stack>
        )}
      />

      <Stack justify="flex-end" gap="3" mt="2">
        <Button type="button" variant="ghost" onClick={handleDiscard}>
          Discard
        </Button>
        <Dialog
          open={discardDialog.open}
          onClose={discardDialog.closeDialog}
          variant="small"
          role="alertdialog"
          header={{ title: 'Discard this dream?' }}
          footer={{
            secondary: { label: 'Cancel', onClick: discardDialog.closeDialog },
            primary: { label: 'Discard', variant: 'destructive', onClick: confirmDiscard },
          }}
        >
          <Text fontFamily="body" color="inkSoft">
            Unsaved changes will be lost.
          </Text>
        </Dialog>
        <Button type="submit" loading={isSubmitting}>
          {submitLabel}
        </Button>
      </Stack>
    </Card>
  );
}
