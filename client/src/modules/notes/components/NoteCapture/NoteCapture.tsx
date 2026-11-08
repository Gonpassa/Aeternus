import { useRef, useState, type FormEventHandler } from 'react';
import { Controller, useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import type { CreateLiteratureNoteRequest } from '@nee3/shared-types';
import { Button } from '../../../../atoms/Button/Button.tsx';
import { IndexCard } from '../../../../atoms/IndexCard/IndexCard.tsx';
import { Input } from '../../../../atoms/Input/Input.tsx';
import { Stack } from '../../../../atoms/Stack/Stack.tsx';
import { Text } from '../../../../atoms/Text/Text.tsx';
import { Textarea } from '../../../../atoms/Textarea/Textarea.tsx';
import { ToggleButton } from '../../../../atoms/ToggleButton/ToggleButton.tsx';
import {
  BLANK_CARD,
  WRITTEN_ON_CARD,
  literatureNoteSchema,
  toCreateRequest,
  type NoteCaptureOutput,
  type NoteCaptureValues,
} from './NoteCapture.utils.ts';

export interface NoteCaptureProps {
  // The sections this Source's notes already use, most recently used first. They arrive in the
  // reading page's one payload, so offering them costs no round trip (#72).
  sections: string[];
  onFile: (input: CreateLiteratureNoteRequest) => Promise<void>;
}

// The capture form is not a form - it is a blank index card, the object the note becomes
// (#73, Variant B): the section as the die-cut tab along the top, the position as the catalog
// number in the bottom-right, the body as the card face, and the author's exact words as a
// slip tucked underneath, revealed on demand rather than shown as an empty field. Filing it
// moves the card into the stack and hands back a blank with the tab still set and the position
// cleared and focused, so the next note costs nothing the user does not have to spend.
// The card carries one error line rather than a message per field, so every field it can be
// about points at it: without a visible label beside them, that line is the only thing naming
// what a refused note needs.
const ERROR_ID = 'note-capture-error';

export function NoteCapture({ sections, onFile }: NoteCaptureProps) {
  const {
    control,
    handleSubmit,
    reset,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<NoteCaptureValues, unknown, NoteCaptureOutput>({
    // The tab opens on the section the last note was filed under: a reader resuming a Source
    // is almost always still in that chapter (#68), and the chips below change it in one tap.
    defaultValues: { ...BLANK_CARD, section: sections[0] ?? '' },
    resolver: zodResolver(literatureNoteSchema),
    mode: 'onBlur',
    reValidateMode: 'onChange',
  });
  // The position is focused by hand rather than through RHF's `setFocus`, which needs a
  // registered DOM ref; every field here binds through `Controller` instead, as ADR 0004's
  // controlled-atom rule requires.
  const positionRef = useRef<HTMLInputElement>(null);
  const [excerptOpen, setExcerptOpen] = useState(false);
  // The tab already shows the section it is set to, so offering it again as a chip is a
  // suggestion to do what has been done.
  const currentSection = useWatch({ control, name: 'section' });
  const suggestions = sections.filter((section) => section !== currentSection.trim());

  // One error line for the whole card rather than a message under each field: the card has no
  // field labels to hang them from, and only one of these can be the reason a note was refused.
  const error =
    errors.body?.message ??
    errors.position?.message ??
    errors.section?.message ??
    errors.excerpt?.message;

  const onValid = async (values: NoteCaptureOutput) => {
    try {
      await onFile(toCreateRequest(values));
      // The tab stays set and the position is cleared: the reader has moved on a page, not to
      // another chapter. The excerpt slip is tucked away again with the card it belonged to.
      reset({ ...BLANK_CARD, section: values.section });
      setExcerptOpen(false);
      positionRef.current?.focus();
    } catch {
      // Not field-attributable: the global toast interceptor in api/client.ts has already
      // surfaced the failure, and the card keeps what was written.
    }
  };

  return (
    <IndexCard
      as="form"
      // IndexCard's props are typed against its div-rendering default; `as="form"` changes the
      // rendered element at runtime but not the typed handler signature, hence the cast.
      onSubmit={handleSubmit(onValid) as unknown as FormEventHandler<HTMLDivElement>}
      // Ink-blue, not rust: on a filed card rust means a note left as an open question, and a
      // blank card is not a flagged one.
      accent="inkBlue"
      pt="6"
      pb="12"
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
                // The ring is replaced rather than merely hidden: a rule under the tab's own
                // text says "you are typing here" without boxing the tab.
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
              ref={positionRef}
              name={field.name}
              value={field.value}
              onChange={field.onChange}
              onBlur={field.onBlur}
              aria-label="Position"
              aria-describedby={error ? ERROR_ID : undefined}
              placeholder="p."
              // eslint-disable-next-line jsx-a11y/no-autofocus -- the position is where writing
              // a note starts, and the card exists on the page in order to be written on.
              autoFocus
              // As above: the catalog number is written in the corner of the card, not into a
              // box drawn over it, so the recipe's own border and background are replaced here.
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
        {/* This Source's earlier sections, one tap away: a reader stays in a chapter for
            several notes, and typing it again each time is the friction #73 removed. */}
        {suggestions.length > 0 && (
          <Stack gap="1" wrap="wrap">
            {suggestions.map((section) => (
              <Button
                key={section}
                type="button"
                size="xs"
                variant="ghost"
                onClick={() => setValue('section', section, { shouldValidate: true })}
              >
                {section}
              </Button>
            ))}
          </Stack>
        )}

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
              // The field's guidance copy does the work a toolbar's absence might otherwise
              // raise questions about - there is no rich-text editor here (ADR 0017).
              placeholder="A few sentences on one point, in your own words"
              rows={6}
              bg="transparent"
              borderWidth="0"
              px="0"
              resize="vertical"
            />
          )}
        />

        {/* The author's exact words are a slip tucked under the card, revealed on demand
            rather than shown as an empty field (CONTEXT.md, Excerpt). */}
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

        <Stack align="center" justify="space-between" gap="3">
          <Controller
            control={control}
            name="openQuestion"
            render={({ field }) => (
              <ToggleButton type="button" pressed={field.value} onPressedChange={field.onChange}>
                Open question
              </ToggleButton>
            )}
          />
          <Button type="submit" loading={isSubmitting}>
            File it
          </Button>
        </Stack>
      </Stack>
    </IndexCard>
  );
}
