import { describe, expect, it, vi, beforeAll } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { FormSelectField } from './FormSelectField.tsx';

// The same two jsdom gaps Ark's select machine walks into, stubbed as in Select.test.tsx:
// jsdom lays nothing out, so every rect is 0x0 and Ark reads the trigger as hidden, and it
// ships no Element.scrollTo, which the machine calls as the option list opens.
beforeAll(() => {
  Element.prototype.getClientRects = function getClientRects() {
    return [
      { width: 1, height: 1, top: 0, left: 0, bottom: 1, right: 1 },
    ] as unknown as DOMRectList;
  };
  Element.prototype.scrollTo = function scrollTo() {};
});

const KINDS = [
  { value: 'book', label: 'Book' },
  { value: 'article', label: 'Article' },
];

// Choosing an option starts Ark's close transition, and its dismiss layer sits over the form
// until that finishes - a click or a keystroke sent before then is swallowed. Waiting for the
// list to be gone rather than for a timer is what keeps the assertions after it deterministic.
const chooseKind = async (user: ReturnType<typeof userEvent.setup>, label: string) => {
  await user.click(screen.getByRole('combobox', { name: 'Kind' }));
  await user.click(await screen.findByRole('option', { name: label }));
  await waitFor(() => expect(screen.queryByRole('listbox')).not.toBeInTheDocument());
};

const schema = z.object({
  kind: z.enum(['book', 'article'], { message: 'Choose a kind' }),
});
type FormValues = z.input<typeof schema>;

function TestForm({ onSubmit }: { onSubmit: (values: { kind: string }) => void }) {
  const { control, handleSubmit } = useForm<FormValues>({
    defaultValues: { kind: undefined },
    resolver: zodResolver(schema),
    mode: 'onBlur',
    reValidateMode: 'onChange',
  });

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <FormSelectField
        control={control}
        name="kind"
        label="Kind"
        items={KINDS}
        placeholder="Choose a kind"
      />
      <button type="submit">Submit</button>
    </form>
  );
}

describe('FormSelectField', () => {
  it('names the control from its label and shows the placeholder while unset', () => {
    render(<TestForm onSubmit={vi.fn()} />);

    expect(screen.getByRole('combobox', { name: 'Kind' })).toHaveTextContent('Choose a kind');
  });

  it('shows the label as visible text, not only as an accessible name', () => {
    render(<TestForm onSubmit={vi.fn()} />);

    expect(screen.getByText('Kind')).toBeInTheDocument();
  });

  it('submits the chosen option as the field value', async () => {
    const user = userEvent.setup();
    const handleSubmit = vi.fn();
    render(<TestForm onSubmit={handleSubmit} />);

    await chooseKind(user, 'Article');
    await user.click(screen.getByRole('button', { name: 'Submit' }));

    await waitFor(() => expect(handleSubmit).toHaveBeenCalled());
    expect(handleSubmit.mock.calls[0]?.[0]).toMatchObject({ kind: 'article' });
  });

  it('shows the field error on a submit attempt with nothing chosen', async () => {
    const user = userEvent.setup();
    const handleSubmit = vi.fn();
    render(<TestForm onSubmit={handleSubmit} />);

    await user.click(screen.getByRole('button', { name: 'Submit' }));

    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('Choose a kind'));
    expect(handleSubmit).not.toHaveBeenCalled();
  });

  it('clears the error once an option is chosen', async () => {
    const user = userEvent.setup();
    render(<TestForm onSubmit={vi.fn()} />);

    await user.click(screen.getByRole('button', { name: 'Submit' }));
    await waitFor(() => expect(screen.getByRole('alert')).toBeInTheDocument());

    await chooseKind(user, 'Book');

    await waitFor(() => expect(screen.queryByRole('alert')).not.toBeInTheDocument());
  });

  it('marks the trigger invalid while the field has an error', async () => {
    const user = userEvent.setup();
    render(<TestForm onSubmit={vi.fn()} />);

    await user.click(screen.getByRole('button', { name: 'Submit' }));

    await waitFor(() =>
      expect(screen.getByRole('combobox', { name: 'Kind' })).toHaveAttribute(
        'aria-invalid',
        'true',
      ),
    );
  });
});
