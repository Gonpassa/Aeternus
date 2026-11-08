import { describe, expect, it } from 'vitest';
import { render } from '@testing-library/react';
import { IndexCard } from './IndexCard.tsx';

describe('IndexCard', () => {
  it('renders the tab label and catalog number', () => {
    const { getByText } = render(<IndexCard label="Journal" catalogNumber="No. 014" />);

    expect(getByText('Journal')).toBeInTheDocument();
    expect(getByText('No. 014')).toBeInTheDocument();
  });

  it('renders children as the card body when provided', () => {
    const { getByText, queryByText } = render(
      <IndexCard label="Journal" catalogNumber="No. 014">
        Some excerpt text.
      </IndexCard>,
    );

    expect(getByText('Some excerpt text.')).toBeInTheDocument();
    expect(queryByText('undefined')).not.toBeInTheDocument();
  });

  // The Notes capture card writes on the object the note becomes, so the tab and the catalog
  // number each take a node: an input in the tab is the section being entered.
  it('takes a node in the tab and in the catalog number', () => {
    const { getByLabelText } = render(
      <IndexCard
        label={<input aria-label="Section" />}
        catalogNumber={<input aria-label="Position" />}
      />,
    );

    expect(getByLabelText('Section')).toBeInTheDocument();
    expect(getByLabelText('Position')).toBeInTheDocument();
  });

  it('hides a rendered catalog number from assistive tech, but not a node it is given', () => {
    const { getByText, getByLabelText } = render(
      <IndexCard label="Journal" catalogNumber="No. 014" />,
    );
    expect(getByText('No. 014')).toHaveAttribute('aria-hidden', 'true');

    const { container } = render(
      <IndexCard label="Journal" catalogNumber={<input aria-label="Position" />} />,
    );
    expect(getByLabelText('Position').closest('[aria-hidden="true"]')).toBeNull();
    expect(container).toBeInTheDocument();
  });

  it('renders without a body when no children are given', () => {
    const { container } = render(<IndexCard label="Journal" catalogNumber="No. 014" />);

    expect(container.querySelectorAll('p').length).toBe(1);
  });
});
