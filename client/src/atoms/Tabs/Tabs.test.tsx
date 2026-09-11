import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { Tabs } from './Tabs.tsx';

const options = [
  { value: 'analytic', label: 'Analytic' },
  { value: 'synthetic', label: 'Synthetic' },
];

describe('Tabs', () => {
  it('marks the active option selected and fires onChange on click', () => {
    const onChange = vi.fn();
    render(<Tabs options={options} value="analytic" onChange={onChange} aria-label="Views" />);

    expect(screen.getByRole('tab', { name: 'Analytic' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('tab', { name: 'Synthetic' })).toHaveAttribute(
      'aria-selected',
      'false',
    );

    fireEvent.click(screen.getByRole('tab', { name: 'Synthetic' }));
    expect(onChange).toHaveBeenCalledWith('synthetic');
  });

  it('moves the selection with arrow keys', () => {
    const onChange = vi.fn();
    render(<Tabs options={options} value="analytic" onChange={onChange} aria-label="Views" />);

    fireEvent.keyDown(screen.getByRole('tab', { name: 'Analytic' }), { key: 'ArrowRight' });
    expect(onChange).toHaveBeenCalledWith('synthetic');
  });
});
