import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { SelectionToolbar } from './SelectionToolbar.tsx';

const rect = {
  top: 200,
  bottom: 220,
  left: 100,
  right: 180,
  width: 80,
  height: 20,
  x: 100,
  y: 200,
  toJSON: () => ({}),
} as DOMRect;

describe('SelectionToolbar', () => {
  it('renders nothing for a null rect', () => {
    render(
      <SelectionToolbar
        rect={null}
        actions={[{ label: 'Tag symbol', onSelect: vi.fn() }]}
        aria-label="Annotate selection"
      />,
    );

    expect(screen.queryByRole('toolbar')).not.toBeInTheDocument();
  });

  it('renders the supplied actions as buttons and fires them on click', () => {
    const onSelect = vi.fn();
    render(
      <SelectionToolbar
        rect={rect}
        actions={[
          { label: 'Add emotional beat', onSelect },
          { label: 'Tag symbol', onSelect: vi.fn() },
        ]}
        aria-label="Annotate selection"
      />,
    );

    expect(screen.getByRole('toolbar', { name: 'Annotate selection' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Add emotional beat' }));
    expect(onSelect).toHaveBeenCalledTimes(1);
  });

  it('prevents a press from collapsing the text selection', () => {
    render(
      <SelectionToolbar
        rect={rect}
        actions={[{ label: 'Tag symbol', onSelect: vi.fn() }]}
        aria-label="Annotate selection"
      />,
    );

    // fireEvent returns false when preventDefault was called - the selection-preserving
    // behavior callers rely on when they read the selection inside onSelect.
    expect(fireEvent.mouseDown(screen.getByRole('button', { name: 'Tag symbol' }))).toBe(false);
  });

  it('moves focus between actions with arrow keys, wrapping at the ends', () => {
    render(
      <SelectionToolbar
        rect={rect}
        actions={[
          { label: 'First', onSelect: vi.fn() },
          { label: 'Second', onSelect: vi.fn() },
        ]}
        aria-label="Annotate selection"
      />,
    );

    const first = screen.getByRole('button', { name: 'First' });
    const second = screen.getByRole('button', { name: 'Second' });
    first.focus();

    fireEvent.keyDown(first, { key: 'ArrowRight' });
    expect(second).toHaveFocus();

    fireEvent.keyDown(second, { key: 'ArrowRight' });
    expect(first).toHaveFocus();

    fireEvent.keyDown(first, { key: 'ArrowLeft' });
    expect(second).toHaveFocus();
  });
});
