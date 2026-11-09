import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TopicTagger } from './TopicTagger.tsx';

describe('TopicTagger', () => {
  it('invites a first Topic, and says Topics are optional', () => {
    render(<TopicTagger names={[]} vocabulary={[]} onChange={vi.fn()} />);

    expect(screen.getByRole('button', { name: 'Add a Topic' })).toBeInTheDocument();
    expect(screen.getByText(/Optional\./)).toBeInTheDocument();
  });

  it('adds a typed name to the list', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<TopicTagger names={['Attention']} vocabulary={['Attention']} onChange={onChange} />);

    await user.click(screen.getByRole('button', { name: 'Add another Topic' }));
    await user.type(screen.getByLabelText('Topic name'), 'Myth');
    await user.click(screen.getByRole('button', { name: 'Add' }));

    expect(onChange).toHaveBeenCalledWith(['Attention', 'Myth']);
  });

  it('offers a Topic already in the vocabulary as a suggestion', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<TopicTagger names={[]} vocabulary={['Attention']} onChange={onChange} />);

    await user.click(screen.getByRole('button', { name: 'Add a Topic' }));
    await user.type(screen.getByLabelText('Topic name'), 'att');
    await user.click(screen.getByRole('button', { name: 'Attention' }));

    // The stored casing wins over what was typed: picking a suggestion is naming the Topic that
    // already exists.
    expect(onChange).toHaveBeenCalledWith(['Attention']);
  });

  // The vocabulary itself is unique on the lowercased name, so the same Topic twice on one
  // carrier says nothing (CONTEXT.md, Topic).
  it('refuses the same Topic again, whatever the casing', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<TopicTagger names={['Attention']} vocabulary={[]} onChange={onChange} />);

    await user.click(screen.getByRole('button', { name: 'Add another Topic' }));
    await user.type(screen.getByLabelText('Topic name'), 'attention');
    await user.click(screen.getByRole('button', { name: 'Add' }));

    expect(onChange).not.toHaveBeenCalled();
  });

  it('takes a Topic off again', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<TopicTagger names={['Attention', 'Myth']} vocabulary={[]} onChange={onChange} />);

    await user.click(screen.getByRole('button', { name: 'Remove the Topic Attention' }));

    expect(onChange).toHaveBeenCalledWith(['Myth']);
  });
});
