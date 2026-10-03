import type { FormEventHandler } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import type { CreateSourceRequest } from '@nee3/shared-types';
import { Button } from '../../../../atoms/Button/Button.tsx';
import { Card } from '../../../../atoms/Card/Card.tsx';
import { FormField } from '../../../../atoms/FormField/FormField.tsx';
import { FormSelectField } from '../../../../atoms/FormSelectField/FormSelectField.tsx';
import { Stack } from '../../../../atoms/Stack/Stack.tsx';
import { SOURCE_KIND_OPTIONS } from '../../sourceKinds.ts';
import {
  sourceSchema,
  toCreateRequest,
  type SourceFormOutput,
  type SourceFormValues,
} from './SourceForm.utils.ts';

export interface SourceFormProps {
  onSubmit: (input: CreateSourceRequest) => Promise<void>;
  onDiscard?: () => void;
}

const DEFAULT_VALUES: SourceFormValues = { title: '', kind: '', author: '', url: '' };

// A real form rather than a title-only input: a Source is a first-class record, and the two
// things it cannot be filed without - what it is called and what kind of thing it is - are
// both asked for here. Topics are deliberately absent; they arrive with their own ticket.
// There is no status field anywhere, because a Source has no lifecycle (CONTEXT.md, Source).
export function SourceForm({ onSubmit, onDiscard }: SourceFormProps) {
  const {
    control,
    handleSubmit,
    formState: { isSubmitting },
  } = useForm<SourceFormValues, unknown, SourceFormOutput>({
    defaultValues: DEFAULT_VALUES,
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
      <FormField control={control} name="title" label="Title" placeholder="What is it called?" />
      <FormSelectField
        control={control}
        name="kind"
        label="Kind"
        items={SOURCE_KIND_OPTIONS}
        placeholder="Choose a kind"
      />
      <FormField control={control} name="author" label="Author" placeholder="Optional" />
      <FormField control={control} name="url" label="Link" placeholder="Optional" />

      <Stack justify="flex-end" gap="3" mt="2">
        {onDiscard && (
          <Button type="button" variant="ghost" onClick={onDiscard}>
            Cancel
          </Button>
        )}
        <Button type="submit" loading={isSubmitting}>
          Add Source
        </Button>
      </Stack>
    </Card>
  );
}
