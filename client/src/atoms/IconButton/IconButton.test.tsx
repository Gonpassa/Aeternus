import { describe, expect, it, vi } from 'vitest';
import { render, fireEvent } from '@testing-library/react';
import { Star } from 'lucide-react';
import { IconButton } from './IconButton.tsx';

describe('IconButton', () => {
  it('renders the icon and the accessible label', () => {
    const { container, getByRole } = render(<IconButton icon={Star} aria-label="Favorite" />);

    expect(getByRole('button', { name: 'Favorite' })).toBeInTheDocument();
    expect(container.querySelector('svg')).toBeInTheDocument();
  });

  it('calls onClick when clicked', () => {
    const handleClick = vi.fn();
    const { getByRole } = render(
      <IconButton icon={Star} aria-label="Favorite" onClick={handleClick} />,
    );

    fireEvent.click(getByRole('button', { name: 'Favorite' }));

    expect(handleClick).toHaveBeenCalledTimes(1);
  });
});
