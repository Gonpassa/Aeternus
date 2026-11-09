import type { FormEventHandler } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import type { CreatePermanentNoteRequest } from '@nee3/shared-types';
import { Button } from '../../../../atoms/Button/Button.tsx';
import { IndexCard } from '../../../../atoms/IndexCard/IndexCard.tsx';
import { Input } from '../../../../atoms/Input/Input.tsx';
import { Stack } from '../../../../atoms/Stack/Stack.tsx';
import { Text } from '../../../../atoms/Text/Text.tsx';
import { Textarea } from '../../../../atoms/Textarea/Textarea.tsx';
import {
  BLANK_COMPOSER,
  permanentNoteSchema,
  toCreateRequest,
  type PermanentNoteOutput,
  type PermanentNoteValues,
} from './PermanentNoteComposer.utils.ts';
import { WRITTEN_ON_CARD_RULED } from '../../utils/cardInput.ts';
import { useTopics } from '../../api/topicHooks.ts';
import { TopicTagger } from '../TopicTagger/TopicTagger.tsx';

export interface PermanentNoteComposerProps {
  // The note the composer was opened from: the Link's target, pre-selected and not a field.
  targetNoteId: number;
  // How that note is named on the card, so the connection is visible while the reason for it
  // is being written rather than confirmed afterwards.
  targetLabel: string;
  onWrite: (input: CreatePermanentNoteRequest) => Promise<void>;
  onDiscard: () => void;
}

// One error line for the whole card, as on the capture card: only one of these fields can be
// the reason a note was refused, and the card has no field labels to hang a message under.
const ERROR_ID = 'permanent-note-composer-error';

// The composer is a card like the one the note will become, and it carries its first Link
// rather than offering to add one later: a Permanent note cannot be saved without a Link at
// any moment, so there is no save-and-link-later here and no bare-note endpoint behind it
// (ADR 0014). The target is the Literature note this was opened from, named on the card and
// not editable; the reason for the connection is a field of the composer rather than a step
// after it (ADR 0015). Topics are optional here, and this is the only note kind that carries its
// own: a Literature note inherits its Source's (#87). Finding other targets is #85.
export function PermanentNoteComposer({
  targetNoteId,
  targetLabel,
  onWrite,
  onDiscard,
}: PermanentNoteComposerProps) {
  const topics = useTopics();
  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<PermanentNoteValues, unknown, PermanentNoteOutput>({
    defaultValues: BLANK_COMPOSER,
    resolver: zodResolver(permanentNoteSchema),
    mode: 'onBlur',
    reValidateMode: 'onChange',
  });

  const error =
    errors.title?.message ??
    errors.body?.message ??
    errors.reason?.message ??
    errors.topicNames?.message ??
    errors.topicNames?.root?.message;

  const onValid = async (values: PermanentNoteOutput) => {
    try {
      await onWrite(toCreateRequest(values, targetNoteId));
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
      aria-label="Write a Permanent note"
      // Ink-blue as on the blank capture card: moss and rust are what a filed card says about
      // itself, and nothing has been filed yet.
      accent="inkBlue"
      label="Permanent note"
      // No catalog number: a Permanent note is bound to no Source and carries no Locator, so
      // the corner the card keeps for one stays empty (ADR 0012).
      catalogNumber=""
      pt="6"
      pb="8"
    >
      <Stack direction="column" gap="3">
        <Controller
          control={control}
          name="title"
          render={({ field }) => (
            <Textarea
              ref={field.ref}
              name={field.name}
              value={field.value}
              onChange={field.onChange}
              onBlur={field.onBlur}
              aria-label="The claim"
              aria-describedby={error ? ERROR_ID : undefined}
              // The guidance copy is where the single-claim constraint is stated: a title that
              // needs an "and" is two notes (ADR 0017).
              placeholder="The idea as a full sentence - a claim, not a topic"
              rows={2}
              bg="transparent"
              borderWidth="0"
              px="0"
              textStyle="bodyStrong"
              resize="vertical"
              // eslint-disable-next-line jsx-a11y/no-autofocus -- the composer is opened by an
              // explicit action in order to write in it, and the claim is where that starts.
              autoFocus
            />
          )}
        />

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
              aria-label="The idea"
              aria-describedby={error ? ERROR_ID : undefined}
              placeholder="The idea in your own words, in full"
              rows={6}
              bg="transparent"
              borderWidth="0"
              px="0"
              resize="vertical"
            />
          )}
        />

        {/* The connection is shown as made and the reason asked for beside it, because the
            reason is a report of the thought that produced the Link rather than a
            justification reconstructed afterwards (ADR 0015). */}
        <Stack
          direction="column"
          gap="1"
          bg="paper"
          borderLeftWidth="3px"
          borderLeftColor="moss"
          pl="3"
          py="2"
        >
          <Text variant="eyebrow" color="moss">
            Connects to
          </Text>
          <Text textStyle="body" color="ink">
            {targetLabel}
          </Text>
          <Controller
            control={control}
            name="reason"
            render={({ field }) => (
              <Input
                ref={field.ref}
                name={field.name}
                value={field.value}
                onChange={field.onChange}
                onBlur={field.onBlur}
                aria-label="Why these belong together"
                aria-describedby={error ? ERROR_ID : undefined}
                placeholder="Why these belong together, in one line"
                css={WRITTEN_ON_CARD_RULED}
              />
            )}
          />
        </Stack>

        <Controller
          control={control}
          name="topicNames"
          render={({ field }) => (
            <TopicTagger
              names={field.value}
              vocabulary={(topics.data ?? []).map((topic) => topic.name)}
              onChange={field.onChange}
            />
          )}
        />

        {error && (
          <Text id={ERROR_ID} variant="formError" role="alert">
            {error}
          </Text>
        )}

        <Stack align="center" justify="flex-end" gap="3">
          <Button type="button" variant="ghost" onClick={onDiscard}>
            Discard
          </Button>
          <Button type="submit" loading={isSubmitting}>
            File the idea
          </Button>
        </Stack>
      </Stack>
    </IndexCard>
  );
}
