import { useState, type FormEventHandler } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import type { LiteratureNote, UpdateLiteratureNoteRequest } from '@nee3/shared-types';
import { Button } from '../../../../../../atoms/Button/Button.tsx';
import { IndexCard } from '../../../../../../atoms/IndexCard/IndexCard.tsx';
import { Input } from '../../../../../../atoms/Input/Input.tsx';
import { Stack } from '../../../../../../atoms/Stack/Stack.tsx';
import { Text } from '../../../../../../atoms/Text/Text.tsx';
import { Textarea } from '../../../../../../atoms/Textarea/Textarea.tsx';
import { ToggleButton } from '../../../../../../atoms/ToggleButton/ToggleButton.tsx';
import {
  literatureNoteSchema,
  toNoteCardValues,
  toNotePayload,
  type NoteCardOutput,
  type NoteCardValues,
} from '../../../../utils/literatureNoteForm.ts';
import { WRITTEN_ON_CARD } from '../../../../utils/cardInput.ts';

export interface NoteEditProps {
  note: LiteratureNote;
  onSave: (input: UpdateLiteratureNoteRequest) => Promise<void>;
  onCancel: () => void;
  onDelete: () => void;
}

const ERROR_ID = 'note-edit-error';

// The filed card, opened for correction: the same card in the same anatomy, with its own text
// in the fields rather than a form drawn somewhere else (#73). Writing a note closed-book is a
// discipline at the moment of capture, not a constraint on the stored text, so everything the
// card carries is editable afterwards - the open-question flag included, which is the half of
// #82 that waited for this path (CONTEXT.md, Literature note).
export function NoteEdit({ note, onSave, onCancel, onDelete }: NoteEditProps) {
  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<NoteCardValues, unknown, NoteCardOutput>({
    defaultValues: toNoteCardValues(note),
    resolver: zodResolver(literatureNoteSchema),
    mode: 'onBlur',
    reValidateMode: 'onChange',
  });
  // An excerpt that exists is shown, because it is what is being corrected; one that was never
  // written stays a slip to add on demand, as it is on a blank card.
  const [excerptOpen, setExcerptOpen] = useState(note.excerpt !== null);

  // One error line for the whole card rather than a message under each field, as on capture:
  // the card has no field labels to hang them from.
  const error =
    errors.body?.message ??
    errors.position?.message ??
    errors.section?.message ??
    errors.excerpt?.message;

  const onValid = async (values: NoteCardOutput) => {
    try {
      await onSave(toNotePayload(values));
    } catch {
      // Not field-attributable: the global toast interceptor in api/client.ts has already
      // surfaced the failure, and the card keeps the correction as typed.
    }
  };

  return (
    <IndexCard
      as="form"
      // IndexCard's props are typed against its div-rendering default; `as="form"` changes the
      // rendered element at runtime but not the typed handler signature, hence the cast.
      onSubmit={handleSubmit(onValid) as unknown as FormEventHandler<HTMLDivElement>}
      aria-label={`Editing the note on ${note.section ?? note.position ?? 'this Source'}`}
      // Ink-blue while it is being written on, as the blank card is: rust on a filed card means
      // an open question, and a card under correction is not making that claim yet.
      accent="inkBlue"
      pt="6"
      pb="10"
      label={
        <Controller
          control={control}
          name="section"
          render={({ field }) => (
            <Input
              ref={field.ref}
              name={field.name}
              value={field.value}
              onChange={field.onChange}
              onBlur={field.onBlur}
              aria-label="Section"
              aria-describedby={error ? ERROR_ID : undefined}
              placeholder="Section"
              // Through `css` rather than style props: Input applies its recipe through `css`,
              // which outranks props, so the field would otherwise keep the recipe's box - and
              // a boxed input in the tab is the one thing a die-cut tab is not.
              css={{
                ...WRITTEN_ON_CARD,
                width: '9rem',
                color: 'paper',
                textStyle: 'label',
                '&::placeholder': { color: 'paper', opacity: 0.6 },
                '&:focus-visible': { outline: 'none', boxShadow: 'inset 0 -1px 0 {colors.paper}' },
              }}
            />
          )}
        />
      }
      catalogNumber={
        <Controller
          control={control}
          name="position"
          render={({ field }) => (
            <Input
              ref={field.ref}
              name={field.name}
              value={field.value}
              onChange={field.onChange}
              onBlur={field.onBlur}
              aria-label="Position"
              aria-describedby={error ? ERROR_ID : undefined}
              placeholder="p."
              css={{
                ...WRITTEN_ON_CARD,
                width: '6rem',
                textAlign: 'right',
                fontFamily: 'mono',
                fontSize: '0.75rem',
                color: 'inkSoft',
                '&::placeholder': { color: 'inkSoft', opacity: 0.6 },
                '&:focus-visible': { outline: 'none', boxShadow: 'inset 0 -1px 0 {colors.moss}' },
              }}
            />
          )}
        />
      }
    >
      <Stack direction="column" gap="3">
        <Controller
          control={control}
          name="body"
          render={({ field }) => (
            <Textarea
              ref={field.ref}
              name={field.name}
              value={field.value}
              onChange={field.onChange}
              onBlur={field.onBlur}
              aria-label="Note"
              aria-describedby={error ? ERROR_ID : undefined}
              rows={6}
              bg="transparent"
              borderWidth="0"
              px="0"
              resize="vertical"
            />
          )}
        />

        {excerptOpen ? (
          <Controller
            control={control}
            name="excerpt"
            render={({ field }) => (
              <Textarea
                ref={field.ref}
                name={field.name}
                value={field.value}
                onChange={field.onChange}
                onBlur={field.onBlur}
                aria-label="The author's words"
                aria-describedby={error ? ERROR_ID : undefined}
                placeholder="Their words, exactly as written"
                rows={3}
                bg="paper"
                borderWidth="0"
                borderLeftWidth="3px"
                borderLeftColor="rust"
                borderRadius="0"
              />
            )}
          />
        ) : (
          <Button
            type="button"
            size="xs"
            variant="ghost"
            alignSelf="flex-start"
            onClick={() => setExcerptOpen(true)}
          >
            Add the author&apos;s words
          </Button>
        )}

        {error && (
          <Text id={ERROR_ID} variant="formError" role="alert">
            {error}
          </Text>
        )}

        <Stack align="center" justify="space-between" gap="3" wrap="wrap">
          <Controller
            control={control}
            name="openQuestion"
            render={({ field }) => (
              <ToggleButton type="button" pressed={field.value} onPressedChange={field.onChange}>
                Open question
              </ToggleButton>
            )}
          />
          <Stack align="center" gap="2">
            {/* Throwing the card away sits with correcting it, since noticing a note is wrong
                is the same moment as deciding it is not worth keeping. */}
            <Button type="button" size="xs" variant="ghost" onClick={onDelete}>
              Delete this note
            </Button>
            <Button type="button" variant="ghost" onClick={onCancel}>
              Cancel
            </Button>
            <Button type="submit" loading={isSubmitting}>
              Save
            </Button>
          </Stack>
        </Stack>
      </Stack>
    </IndexCard>
  );
}
