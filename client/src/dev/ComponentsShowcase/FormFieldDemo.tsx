import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { FormField } from '../../atoms/FormField/FormField.tsx';
import { Section } from './Section.tsx';

const formFieldSchema = z.object({
  email: z.string().min(1, 'Email is required').email('Enter a valid email'),
});
type FormFieldShowcaseValues = z.infer<typeof formFieldSchema>;

function FormFieldShowcase() {
  const { control } = useForm<FormFieldShowcaseValues>({
    defaultValues: { email: '' },
    resolver: zodResolver(formFieldSchema),
    mode: 'onBlur',
    reValidateMode: 'onChange',
  });

  return <FormField control={control} name="email" label="Email" placeholder="you@example.com" />;
}

export function FormFieldDemo() {
  return (
    <Section
      title="FormField"
      description="RHF-bound labeled input with inline validation, from atoms/FormField - blur away then back to see the error"
    >
      <FormFieldShowcase />
    </Section>
  );
}
