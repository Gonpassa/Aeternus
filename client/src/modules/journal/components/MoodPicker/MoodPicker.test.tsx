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
});
