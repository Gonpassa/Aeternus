import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { FormSelectField } from '../../atoms/FormSelectField/FormSelectField.tsx';
import { Button } from '../../atoms/Button/Button.tsx';
import { Stack } from '../../atoms/Stack/Stack.tsx';
import { Section } from './Section.tsx';

const KINDS = [
  { value: 'book', label: 'Book' },
  { value: 'article', label: 'Article' },
  { value: 'video', label: 'Video' },
  { value: 'other', label: 'Something else' },
];

const formSelectFieldSchema = z.object({
  kind: z.enum(['book', 'article', 'video', 'other'], { message: 'Choose a kind' }),
});
type FormSelectFieldShowcaseValues = z.input<typeof formSelectFieldSchema>;

function FormSelectFieldShowcase() {
  const { control, handleSubmit } = useForm<FormSelectFieldShowcaseValues>({
    defaultValues: { kind: undefined },
    resolver: zodResolver(formSelectFieldSchema),
    mode: 'onBlur',
    reValidateMode: 'onChange',
  });

  return (
    <Stack as="form" direction="column" align="start" gap="3" onSubmit={handleSubmit(() => {})}>
      <FormSelectField
        control={control}
        name="kind"
        label="Kind"
        items={KINDS}
        placeholder="Choose a kind"
      />
      <Button type="submit" size="sm" variant="outline">
        Submit
      </Button>
    </Stack>
  );
}

export function FormSelectFieldDemo() {
  return (
    <Section
      title="FormSelectField"
      description="RHF-bound labeled select with inline validation, from atoms/FormSelectField - submit with nothing chosen to see the error"
    >
      <FormSelectFieldShowcase />
    </Section>
  );
}
