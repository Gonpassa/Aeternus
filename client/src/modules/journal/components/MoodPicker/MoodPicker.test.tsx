import { describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import type { PrimaryMood, SpecificEmotion } from '@nee3/shared-types';
import { MoodPicker } from './MoodPicker.tsx';
import {
  entrySchema,
  type EntryFormValues,
  type EntryFormOutput,
} from '../EntryForm/EntryForm.utils.ts';

interface TestHarnessProps {
  defaultPrimaryMood?: PrimaryMood | null;
  defaultSpecificEmotion?: SpecificEmotion | null;
  validate?: boolean;
  onSubmit?: (values: EntryFormOutput) => void;
}

function TestHarness({
  defaultPrimaryMood = null,
  defaultSpecificEmotion = null,
  validate = false,
  onSubmit = vi.fn(),
}: TestHarnessProps) {
  const { control, handleSubmit } = useForm<EntryFormValues, unknown, EntryFormOutput>({
    defaultValues: {
      date: '2026-01-01',
      title: 'Untitled',
      content: '',
      primaryMood: defaultPrimaryMood,
      specificEmotion: defaultSpecificEmotion,
    },
    resolver: validate ? zodResolver(entrySchema) : undefined,
  });

  return (
    <form onSubmit={handleSubmit((values) => onSubmit(values))}>
      <MoodPicker control={control} />
      <button type="submit">Submit</button>
    </form>
  );
}

describe('MoodPicker', () => {
  it('does not show specific emotions until a primary mood is chosen', () => {
    render(<TestHarness />);
    expect(screen.queryByRole('radio', { name: 'content' })).not.toBeInTheDocument();
  });

  it("selecting a primary mood reveals only that bucket's specific emotions", () => {
    render(<TestHarness />);

    fireEvent.click(screen.getByRole('radio', { name: /happy/i }));

    expect(screen.getByRole('radio', { name: /happy/i })).toHaveAttribute('aria-checked', 'true');
    expect(screen.getByRole('radio', { name: 'content' })).toBeInTheDocument();
  });

  it('shows only the happy bucket when happy is selected, not other buckets', () => {
    render(<TestHarness defaultPrimaryMood="happy" />);
    expect(screen.getByRole('radio', { name: 'content' })).toBeInTheDocument();
    expect(screen.queryByRole('radio', { name: 'peaceful' })).not.toBeInTheDocument();
  });

  it('submits both values when a specific emotion is picked', async () => {
    const onSubmit = vi.fn();
    render(<TestHarness defaultPrimaryMood="happy" onSubmit={onSubmit} />);

    fireEvent.click(screen.getByRole('radio', { name: 'content' }));
    fireEvent.click(screen.getByRole('button', { name: 'Submit' }));

    await screen.findByRole('radio', { name: 'content' });
    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({ primaryMood: 'happy', specificEmotion: 'content' }),
    );
  });

  it('renders a steady swatch that is selectable alongside the other primary moods', () => {
    render(<TestHarness />);

    fireEvent.click(screen.getByRole('radio', { name: /steady/i }));

    expect(screen.getByRole('radio', { name: /steady/i })).toHaveAttribute('aria-checked', 'true');
  });

  it('renders a custom emotion text input alongside the fixed buttons', () => {
    render(<TestHarness defaultPrimaryMood="happy" />);
    expect(screen.getByPlaceholderText('Custom')).toBeInTheDocument();
  });

  it('typing a custom emotion updates the input and deselects fixed buttons', () => {
    render(<TestHarness defaultPrimaryMood="happy" />);

    fireEvent.change(screen.getByPlaceholderText('Custom'), { target: { value: 'bittersweet' } });

    expect(screen.getByPlaceholderText('Custom')).toHaveValue('bittersweet');
    expect(screen.getByRole('radio', { name: 'content' })).toHaveAttribute('aria-checked', 'false');
  });

  it('clicking a fixed emotion clears the custom input', () => {
    render(<TestHarness defaultPrimaryMood="happy" defaultSpecificEmotion="bittersweet" />);
    expect(screen.getByPlaceholderText('Custom')).toHaveValue('bittersweet');

    fireEvent.click(screen.getByRole('radio', { name: 'content' }));

    expect(screen.getByRole('radio', { name: 'content' })).toHaveAttribute('aria-checked', 'true');
    expect(screen.getByPlaceholderText('Custom')).toHaveValue('');
  });

  it('emptying the custom input clears the specific emotion', async () => {
    const onSubmit = vi.fn();
    render(
      <TestHarness
        defaultPrimaryMood="happy"
        defaultSpecificEmotion="bittersweet"
        onSubmit={onSubmit}
      />,
    );

    fireEvent.change(screen.getByPlaceholderText('Custom'), { target: { value: '' } });
    fireEvent.click(screen.getByRole('button', { name: 'Submit' }));

    await screen.findByPlaceholderText('Custom');
    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({ primaryMood: 'happy', specificEmotion: null }),
    );
  });

  it('typing a custom value that matches a fixed suggestion does not switch to the fixed-button-selected state', () => {
    render(<TestHarness defaultPrimaryMood="happy" />);

    fireEvent.change(screen.getByPlaceholderText('Custom'), { target: { value: 'content' } });

    expect(screen.getByPlaceholderText('Custom')).toHaveValue('content');
    expect(screen.getByRole('radio', { name: 'content' })).toHaveAttribute('aria-checked', 'false');
  });

  it('blocks submission and shows an inline error when no primary mood is chosen', async () => {
    const onSubmit = vi.fn();
    render(<TestHarness validate onSubmit={onSubmit} />);

    fireEvent.click(screen.getByRole('button', { name: 'Submit' }));

    const error = await screen.findByRole('alert');
    expect(error).toHaveTextContent('Please choose a mood.');
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('clears the mood error once a primary mood is chosen', async () => {
    render(<TestHarness validate />);

    fireEvent.click(screen.getByRole('button', { name: 'Submit' }));
    await screen.findByRole('alert');

    fireEvent.click(screen.getByRole('radio', { name: /happy/i }));

    await waitFor(() => {
      expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    });
  });
});
