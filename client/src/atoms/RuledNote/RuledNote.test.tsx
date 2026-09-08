import { describe, expect, it } from 'vitest';
import { render } from '@testing-library/react';
import { RuledNote } from './RuledNote.tsx';

describe('RuledNote', () => {
  it('renders its children', () => {
    const { getByText } = render(<RuledNote>A margin note</RuledNote>);

    expect(getByText('A margin note')).toBeInTheDocument();
  });

  it('accepts a rule color without throwing', () => {
    const { getByText } = render(<RuledNote rule="moss">A synthetic entry</RuledNote>);

    expect(getByText('A synthetic entry')).toBeInTheDocument();
  });
});
