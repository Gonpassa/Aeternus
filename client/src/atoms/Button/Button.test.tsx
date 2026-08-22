import { describe, expect, it } from 'vitest';
import { render } from '@testing-library/react';
import { Button } from './Button.tsx';

describe('Button', () => {
  it('renders as disabled and non-interactive', () => {
    const { getByRole } = render(<Button disabled>Save</Button>);

    expect(getByRole('button', { name: 'Save' })).toBeDisabled();
  });

  it('renders a loading spinner and becomes non-interactive', () => {
    const { getByRole } = render(<Button loading>Save</Button>);

    expect(getByRole('button')).toBeDisabled();
  });

  it('renders loadingText while loading', () => {
    const { getByText } = render(
      <Button loading loadingText="Saving…">
        Save
      </Button>,
    );

    expect(getByText('Saving…')).toBeInTheDocument();
  });
});
