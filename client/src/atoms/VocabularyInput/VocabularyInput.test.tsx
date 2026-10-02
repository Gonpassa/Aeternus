import { describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { VocabularyInput, type VocabularyInputProps } from './VocabularyInput.tsx';

const TOPICS = ['Attention', 'Attrition', 'Memory', 'Metaphor', 'Mnemonics', 'Motive'];

const renderInput = (overrides: Partial<VocabularyInputProps> = {}) => {
  const onSubmit = overrides.onSubmit ?? vi.fn();
  const onCancel = overrides.onCancel ?? vi.fn();
  render(
    <VocabularyInput
      vocabulary={overrides.vocabulary ?? TOPICS}
      label={overrides.label ?? 'Topic name'}
      placeholder={overrides.placeholder}
      submitLabel={overrides.submitLabel}
      onSubmit={onSubmit}
      onCancel={onCancel}
    />,
  );
  return { onSubmit, onCancel };
};

const getField = () => screen.getByLabelText('Topic name');

describe('VocabularyInput', () => {
  it('names the field from the label the caller gives it', () => {
    renderInput({ label: 'Symbol name', placeholder: 'Symbol name…' });

    expect(screen.getByLabelText('Symbol name')).toHaveAttribute('placeholder', 'Symbol name…');
  });

  it('focuses the field on mount, since it opens in answer to the user asking for it', () => {
    renderInput();

    expect(getField()).toHaveFocus();
  });

  it('suggests nothing until something is typed', () => {
    renderInput();

    expect(screen.queryByRole('button', { name: 'Memory' })).not.toBeInTheDocument();
  });

  it('suggests existing terms matching what is typed, case-insensitively', async () => {
    const user = userEvent.setup();
    renderInput();

    await user.type(getField(), 'me');

    expect(screen.getByRole('button', { name: 'Memory' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Metaphor' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Motive' })).not.toBeInTheDocument();
  });

  it('caps the suggestion list rather than covering the page with it', async () => {
    const user = userEvent.setup();
    const many = ['Alpha', 'Beta', 'Gamma', 'Delta', 'Epsilon', 'Zeta', 'Eta'].map(
      (name) => `${name} tag`,
    );
    renderInput({ vocabulary: many });

    await user.type(getField(), 'tag');

    const suggested = many.filter((name) => screen.queryByRole('button', { name }));
    expect(suggested).toHaveLength(5);
  });

  it('submits the chosen suggestion with its stored casing, not what was typed', async () => {
    const user = userEvent.setup();
    const { onSubmit } = renderInput();

    await user.type(getField(), 'mem');
    await user.click(screen.getByRole('button', { name: 'Memory' }));

    expect(onSubmit).toHaveBeenCalledWith('Memory');
  });

  it('submits a freely typed term, trimmed, keeping the casing as typed', async () => {
    const user = userEvent.setup();
    const { onSubmit } = renderInput();

    await user.type(getField(), '  Spaced Repetition  ');
    await user.click(screen.getByRole('button', { name: 'Add' }));

    expect(onSubmit).toHaveBeenCalledWith('Spaced Repetition');
  });

  it('submits on Enter', async () => {
    const user = userEvent.setup();
    const { onSubmit } = renderInput();

    await user.type(getField(), 'Motive{Enter}');

    expect(onSubmit).toHaveBeenCalledWith('Motive');
  });

  it('ignores a submit with nothing but whitespace typed', async () => {
    const user = userEvent.setup();
    const { onSubmit } = renderInput();

    await user.type(getField(), '   {Enter}');
    await user.click(screen.getByRole('button', { name: 'Add' }));

    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('labels the submit button as the caller asks', () => {
    renderInput({ submitLabel: 'Tag' });

    expect(screen.getByRole('button', { name: 'Tag' })).toBeInTheDocument();
  });

  it('cancels on Escape and on the cancel button', async () => {
    const user = userEvent.setup();
    const { onCancel } = renderInput();

    await user.type(getField(), '{Escape}');
    await user.click(screen.getByRole('button', { name: 'Cancel' }));

    expect(onCancel).toHaveBeenCalledTimes(2);
  });

  it('stays open and usable when the submit handler rejects', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn().mockRejectedValue(new Error('taken'));
    renderInput({ onSubmit });

    await user.type(getField(), 'Memory{Enter}');

    await waitFor(() => expect(screen.getByRole('button', { name: 'Add' })).toBeEnabled());
    expect(getField()).toBeInTheDocument();
  });

  it('does not submit twice while a submission is in flight', async () => {
    const user = userEvent.setup();
    let release = () => {};
    const onSubmit = vi.fn(
      () =>
        new Promise<void>((resolve) => {
          release = resolve;
        }),
    );
    renderInput({ onSubmit });

    await user.type(getField(), 'Memory{Enter}');
    await user.type(getField(), '{Enter}');

    expect(onSubmit).toHaveBeenCalledTimes(1);
    release();
  });
});
