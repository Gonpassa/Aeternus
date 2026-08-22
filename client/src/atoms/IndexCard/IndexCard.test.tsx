import { describe, expect, it } from 'vitest';
import { render } from '@testing-library/react';
import { IndexCard } from './IndexCard.tsx';

describe('IndexCard', () => {
  it('renders the title, tab label, and catalog number', () => {
    const { getByText } = render(
      <IndexCard title="A good day" label="Journal" catalogNumber="No. 014" />,
    );

    expect(getByText('A good day')).toBeInTheDocument();
    expect(getByText('Journal')).toBeInTheDocument();
    expect(getByText('No. 014')).toBeInTheDocument();
  });

  it('renders children as the card body when provided', () => {
    const { getByText, queryByText } = render(
      <IndexCard title="A good day" label="Journal" catalogNumber="No. 014">
        Some excerpt text.
      </IndexCard>,
    );

    expect(getByText('Some excerpt text.')).toBeInTheDocument();
    expect(queryByText('undefined')).not.toBeInTheDocument();
  });

  it('renders without a body when no children are given', () => {
    const { container } = render(
      <IndexCard title="A good day" label="Journal" catalogNumber="No. 014" />,
    );

    expect(container.querySelectorAll('p').length).toBe(1);
  });
});
