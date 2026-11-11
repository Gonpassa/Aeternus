import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { FormField } from '../../atoms/FormField/FormField.tsx';
import { Section } from './Section.tsx';

const formFieldSchema = z.object({
  email: z.string().min(1, 'Email is required').email('Enter a valid email'),
  handle: z.string(),
});
type FormFieldShowcaseValues = z.infer<typeof formFieldSchema>;

function FormFieldShowcase() {
  const { control } = useForm<FormFieldShowcaseValues>({
    defaultValues: { email: '', handle: '' },
    resolver: zodResolver(formFieldSchema),
    mode: 'onBlur',
    reValidateMode: 'onChange',
  });

  return (
    <>
      <FormField control={control} name="email" label="Email" placeholder="you@example.com" />
      <FormField
        control={control}
        name="handle"
        label="Handle (normalizeOnBlur)"
        placeholder="Type  Some Name  and tab away"
        normalizeOnBlur={(value) => value.trim().toLowerCase().replace(/\s+/g, '-')}
      />
    </>
  );
}

export function FormFieldDemo() {
  return (
    <Section
      title="FormField"
      description="RHF-bound labeled input with inline validation, from atoms/FormField - blur away then back to see the error; the second field is rewritten as it is left"
    >
      <FormFieldShowcase />
    </Section>
  );
}
