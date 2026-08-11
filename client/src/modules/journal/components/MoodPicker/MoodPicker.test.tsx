import { describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MoodPicker } from './MoodPicker.tsx';

describe('MoodPicker', () => {
  it('does not show specific emotions until a primary mood is chosen', () => {
    render(<MoodPicker primaryMood={null} specificEmotion={null} onChange={vi.fn()} />);
    expect(screen.queryByRole('radio', { name: 'content' })).not.toBeInTheDocument();
  });

  it("selecting a primary mood reveals only that bucket's specific emotions", () => {
    const handleChange = vi.fn();
    render(<MoodPicker primaryMood={null} specificEmotion={null} onChange={handleChange} />);

    fireEvent.click(screen.getByRole('radio', { name: /happy/i }));

    expect(handleChange).toHaveBeenLastCalledWith({ primaryMood: 'happy', specificEmotion: null });
  });

  it('shows only the happy bucket when happy is selected, not other buckets', () => {
    render(<MoodPicker primaryMood="happy" specificEmotion={null} onChange={vi.fn()} />);
    expect(screen.getByRole('radio', { name: 'content' })).toBeInTheDocument();
    expect(screen.queryByRole('radio', { name: 'peaceful' })).not.toBeInTheDocument();
  });

  it('calls onChange with both values when a specific emotion is picked', () => {
    const handleChange = vi.fn();
    render(<MoodPicker primaryMood="happy" specificEmotion={null} onChange={handleChange} />);

    fireEvent.click(screen.getByRole('radio', { name: 'content' }));

    expect(handleChange).toHaveBeenCalledWith({ primaryMood: 'happy', specificEmotion: 'content' });
  });

  it('renders a custom emotion text input alongside the fixed buttons', () => {
    render(<MoodPicker primaryMood="happy" specificEmotion={null} onChange={vi.fn()} />);
    expect(screen.getByPlaceholderText('Custom')).toBeInTheDocument();
  });

  it('typing a custom emotion calls onChange with the typed value and deselects fixed buttons', () => {
    const handleChange = vi.fn();
    render(<MoodPicker primaryMood="happy" specificEmotion={null} onChange={handleChange} />);

    fireEvent.change(screen.getByPlaceholderText('Custom'), { target: { value: 'bittersweet' } });

    expect(handleChange).toHaveBeenLastCalledWith({
      primaryMood: 'happy',
      specificEmotion: 'bittersweet',
    });
    expect(screen.getByRole('radio', { name: 'content' })).toHaveAttribute('aria-checked', 'false');
  });

  it('clicking a fixed emotion clears the custom input', () => {
    const handleChange = vi.fn();
    const { rerender } = render(
      <MoodPicker primaryMood="happy" specificEmotion="bittersweet" onChange={handleChange} />,
    );
    expect(screen.getByPlaceholderText('Custom')).toHaveValue('bittersweet');

    fireEvent.click(screen.getByRole('radio', { name: 'content' }));
    expect(handleChange).toHaveBeenLastCalledWith({
      primaryMood: 'happy',
      specificEmotion: 'content',
    });

    rerender(<MoodPicker primaryMood="happy" specificEmotion="content" onChange={handleChange} />);
    expect(screen.getByPlaceholderText('Custom')).toHaveValue('');
  });

  it('emptying the custom input calls onChange with null', () => {
    const handleChange = vi.fn();
    render(
      <MoodPicker primaryMood="happy" specificEmotion="bittersweet" onChange={handleChange} />,
    );

    fireEvent.change(screen.getByPlaceholderText('Custom'), { target: { value: '' } });

    expect(handleChange).toHaveBeenLastCalledWith({ primaryMood: 'happy', specificEmotion: null });
  });

  it('typing a custom value that matches a fixed suggestion does not switch to the fixed-button-selected state', () => {
    const handleChange = vi.fn();
    const { rerender } = render(
      <MoodPicker primaryMood="happy" specificEmotion={null} onChange={handleChange} />,
    );

    fireEvent.change(screen.getByPlaceholderText('Custom'), { target: { value: 'content' } });

    expect(handleChange).toHaveBeenLastCalledWith({
      primaryMood: 'happy',
      specificEmotion: 'content',
    });
    expect(screen.getByPlaceholderText('Custom')).toHaveValue('content');
    expect(screen.getByRole('radio', { name: 'content' })).toHaveAttribute('aria-checked', 'false');

    // Simulate the parent echoing the emitted value back down as a controlled prop,
    // which is what previously caused the derived-state bug to fire.
    rerender(<MoodPicker primaryMood="happy" specificEmotion="content" onChange={handleChange} />);

    expect(screen.getByPlaceholderText('Custom')).toHaveValue('content');
    expect(screen.getByRole('radio', { name: 'content' })).toHaveAttribute('aria-checked', 'false');
  });
});
