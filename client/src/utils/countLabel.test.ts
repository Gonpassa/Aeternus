import { describe, expect, it } from 'vitest';
import { countLabel } from './countLabel.ts';

describe('countLabel', () => {
  it('uses the singular for exactly one', () => {
    expect(countLabel(1, 'anchor', 'anchors')).toBe('1 anchor');
  });

  it('uses the plural for more than one', () => {
    expect(countLabel(3, 'emotional beat', 'emotional beats')).toBe('3 emotional beats');
  });

  it('uses the plural for none', () => {
    expect(countLabel(0, 'association', 'associations')).toBe('0 associations');
  });
});
