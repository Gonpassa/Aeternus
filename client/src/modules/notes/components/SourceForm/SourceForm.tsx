import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import type { CreateSourceRequest, SourceWithTopics } from '@nee3/shared-types';
import { Button } from '../../../../atoms/Button/Button.tsx';
import { Card } from '../../../../atoms/Card/Card.tsx';
import { FormField } from '../../../../atoms/FormField/FormField.tsx';
import { FormSelectField } from '../../../../atoms/FormSelectField/FormSelectField.tsx';
import { Stack } from '../../../../atoms/Stack/Stack.tsx';
import { Text } from '../../../../atoms/Text/Text.tsx';
import { SOURCE_KIND_OPTIONS } from '../../sourceKinds.ts';
import { normalizeWebAddress } from '../../utils/webAddress.ts';
import { useTopics } from '../../api/topicHooks.ts';
import { TopicTagger } from '../TopicTagger/TopicTagger.tsx';
import { useSubmitWithPendingTopic } from '../TopicTagger/useSubmitWithPendingTopic.ts';
import {
  sourceSchema,
  toCreateRequest,
  toSourceFormValues,
  type SourceFormOutput,
  type SourceFormValues,
} from './SourceForm.utils.ts';

export interface SourceFormProps {
  onSubmit: (input: CreateSourceRequest) => Promise<void>;
  onDiscard?: () => void;
  // A Source to correct rather than a Source to file. The same form serves both, because the
  // fields a Source has are the same fields afterwards - `kind` included, which changes no
  // other field and so strands nothing when it changes (#83).
  source?: SourceWithTopics;
  submitLabel?: string;
}

const DEFAULT_VALUES: SourceFormValues = {
  title: '',
  kind: '',
  author: '',
  url: '',
  topicNames: [],
};

// A real form rather than a title-only input: a Source is a first-class record, and the two
// things it cannot be filed without - what it is called and what kind of thing it is - are
// both asked for here. Topics are asked for too and are optional: what a Source is about is
// worth recording while it is in front of the user, and a required Topic guarantees vague ones
// (#87). There is no status field anywhere - a Source has no lifecycle (CONTEXT.md, Source).
export function SourceForm({
  onSubmit,
  onDiscard,
  source,
  submitLabel = 'Add Source',
}: SourceFormProps) {
  const topics = useTopics();
  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<SourceFormValues, unknown, SourceFormOutput>({
    defaultValues: source ? toSourceFormValues(source) : DEFAULT_VALUES,
    resolver: zodResolver(sourceSchema),
    mode: 'onBlur',
    reValidateMode: 'onChange',
  });

  const onValid = async (values: SourceFormOutput) => {
    try {
      await onSubmit(toCreateRequest(values));
    } catch {
      // Not field-attributable: the global toast interceptor in api/client.ts has already
      // surfaced the failure, and the form keeps what was typed.
    }
  };

  const { topicTagger, submit } = useSubmitWithPendingTopic(handleSubmit(onValid));

  return (
    <Card
      as="form"
      variant="railed"
      onSubmit={submit}
      display="flex"
      flexDirection="column"
      gap="4"
      maxW="2xl"
    >
      <FormField control={control} name="title" label="Title" placeholder="What is it called?" />
      <FormSelectField
        control={control}
        name="kind"
        label="Kind"
        items={SOURCE_KIND_OPTIONS}
        placeholder="Choose a kind"
      />
      <FormField control={control} name="author" label="Author" placeholder="Optional" />
      {/* "Web address" rather than "Link": a Link is what joins two notes in this module
          (CONTEXT.md, Link), and the scheme is added as the field is left rather than asked for
          (#104). */}
      <FormField
        control={control}
        name="url"
        label="Web address"
        placeholder="Optional"
        normalizeOnBlur={normalizeWebAddress}
      />

      <Controller
        control={control}
        name="topicNames"
        render={({ field }) => (
          <TopicTagger
            ref={topicTagger}
            names={field.value}
            // While the vocabulary is still loading the tagger simply offers no suggestions:
            // typing a name is how a Topic is created, so the field works without them.
            vocabulary={(topics.data ?? []).map((topic) => topic.name)}
            onChange={field.onChange}
          />
        )}
      />
      {errors.topicNames && (
        <Text variant="formError" role="alert">
          {errors.topicNames.message ?? errors.topicNames.root?.message}
        </Text>
      )}

      <Stack justify="flex-end" gap="3" mt="2">
        {onDiscard && (
          <Button type="button" variant="ghost" onClick={onDiscard}>
            Cancel
          </Button>
        )}
        <Button type="submit" loading={isSubmitting}>
          {submitLabel}
        </Button>
      </Stack>
    </Card>
  );
}
