import { describe, expect, it } from 'vitest';
import { render } from '@testing-library/react';
import { DieCutTab } from './DieCutTab.tsx';

describe('DieCutTab', () => {
  it('renders its children', () => {
    const { getByText } = render(<DieCutTab>Journal</DieCutTab>);

    expect(getByText('Journal')).toBeInTheDocument();
  });

  it('accepts a color variant without throwing', () => {
    const { getByText } = render(<DieCutTab color="moss">Catalog</DieCutTab>);

    expect(getByText('Catalog')).toBeInTheDocument();
  });
});
