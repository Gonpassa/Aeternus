import { describe, expect, it, vi, beforeAll } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { Drawer } from './Drawer.tsx';

// The underlying Ark/Chakra dialog primitive defers attaching its dismiss
// (Escape, outside-click) listeners across several requestAnimationFrame/
// setTimeout ticks after open, and jsdom never lays out elements (every
// bounding rect is 0x0), which the focus-trap's tabbable check treats as
// hidden. Wait for the listeners to settle before dispatching dismiss
// events, and give elements a non-zero rect so focus can land on them.
const waitForDismissSetup = () =>
  new Promise((resolve) => {
    setTimeout(resolve, 500);
  });

beforeAll(() => {
  Element.prototype.getClientRects = function getClientRects() {
    return [
      { width: 1, height: 1, top: 0, left: 0, bottom: 1, right: 1 },
    ] as unknown as DOMRectList;
  };
});

function getBackdrop(): HTMLElement {
  const backdrop = document.querySelector('[data-part="backdrop"]');
  if (!backdrop) throw new Error('Drawer backdrop not found');
  return backdrop as HTMLElement;
}

describe('Drawer', () => {
  it('does not render children when closed', () => {
    render(
      <Drawer open={false} onClose={vi.fn()} placement="right" aria-label="Test drawer">
        <button type="button">Inside</button>
      </Drawer>,
    );

    expect(screen.queryByText('Inside')).not.toBeInTheDocument();
  });

  it('renders children when open', () => {
    render(
      <Drawer open onClose={vi.fn()} placement="right" aria-label="Test drawer">
        <button type="button">Inside</button>
      </Drawer>,
    );

    expect(screen.getByText('Inside')).toBeInTheDocument();
  });

  it('calls onClose on Escape keypress', async () => {
    const onClose = vi.fn();
    render(
      <Drawer open onClose={onClose} placement="right" aria-label="Test drawer">
        <button type="button">Inside</button>
      </Drawer>,
    );

    await waitForDismissSetup();
    fireEvent.keyDown(document, { key: 'Escape' });

    await waitFor(() => expect(onClose).toHaveBeenCalled());
  });

  it('calls onClose on outside click when outside-click dismissal is enabled', async () => {
    const onClose = vi.fn();
    render(
      <Drawer open onClose={onClose} placement="right" aria-label="Test drawer">
        <button type="button">Inside</button>
      </Drawer>,
    );

    await waitForDismissSetup();
    fireEvent.pointerDown(getBackdrop(), { clientX: 5, clientY: 5 });

    await waitFor(() => expect(onClose).toHaveBeenCalled());
  });

  it('does not call onClose on outside click when outside-click dismissal is disabled', async () => {
    const onClose = vi.fn();
    render(
      <Drawer
        open
        onClose={onClose}
        placement="right"
        closeOnOutsideClick={false}
        aria-label="Test drawer"
      >
        <button type="button">Inside</button>
      </Drawer>,
    );

    await waitForDismissSetup();
    fireEvent.pointerDown(getBackdrop(), { clientX: 5, clientY: 5 });

    // Negative assertion: give any async dismissal handling a chance to run before checking.
    await new Promise((resolve) => {
      setTimeout(resolve, 200);
    });
    expect(onClose).not.toHaveBeenCalled();
  });

  it('reflects the placement prop on the content element', () => {
    render(
      <Drawer open onClose={vi.fn()} placement="left" aria-label="Test drawer">
        <button type="button">Inside</button>
      </Drawer>,
    );

    expect(screen.getByRole('dialog')).toHaveAttribute('data-placement', 'left');
  });

  it('moves focus into the drawer when it opens', async () => {
    render(
      <Drawer open onClose={vi.fn()} placement="right" aria-label="Test drawer">
        <button type="button">First</button>
      </Drawer>,
    );

    await waitFor(() => {
      expect(screen.getByText('First')).toHaveFocus();
    });
  });
});
