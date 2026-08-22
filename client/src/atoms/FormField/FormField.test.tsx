import { describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { FormField } from './FormField.tsx';

const schema = z.object({
  username: z.string().min(1, 'Username is required'),
});
type FormValues = z.infer<typeof schema>;

function TestForm({ onSubmit }: { onSubmit: (values: FormValues) => void }) {
  const { control, handleSubmit } = useForm<FormValues>({
    defaultValues: { username: '' },
    resolver: zodResolver(schema),
    mode: 'onBlur',
    reValidateMode: 'onChange',
  });

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <FormField control={control} name="username" label="Username" />
      <button type="submit">Submit</button>
    </form>
  );
}

describe('FormField', () => {
  it('shows a field-level error on blur when invalid', async () => {
    render(<TestForm onSubmit={vi.fn()} />);
    const input = screen.getByLabelText('Username');

    fireEvent.blur(input);

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent('Username is required');
    });
  });

  it('revalidates live once a submit attempt has surfaced an error', async () => {
    const handleSubmit = vi.fn();
    render(<TestForm onSubmit={handleSubmit} />);

    fireEvent.click(screen.getByRole('button', { name: 'Submit' }));

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent('Username is required');
    });
    expect(handleSubmit).not.toHaveBeenCalled();

    fireEvent.change(screen.getByLabelText('Username'), { target: { value: 'gonzalo' } });

    await waitFor(() => {
      expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    });
  });

  it('does not show an error before the field has been touched', () => {
    render(<TestForm onSubmit={vi.fn()} />);
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });
});
