import { describe, expect, it, vi, beforeAll } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Select } from './Select.tsx';

// Two jsdom gaps Ark's select machine walks straight into. jsdom never lays out
// elements (every bounding rect is 0x0), which Ark's tabbable check treats as
// hidden, so give elements a non-zero rect, as `Drawer.test.tsx` does for the
// same reason. jsdom also ships no `Element.scrollTo`, and the machine scrolls
// the option list on open - unstubbed it throws mid-transition and the selection
// that follows never lands.
beforeAll(() => {
  Element.prototype.getClientRects = function getClientRects() {
    return [
      { width: 1, height: 1, top: 0, left: 0, bottom: 1, right: 1 },
    ] as unknown as DOMRectList;
  };
  Element.prototype.scrollTo = function scrollTo() {};
});

const MOODS = [
  { value: 'anxious', label: 'Anxious' },
  { value: 'content', label: 'Content' },
  { value: 'restless', label: 'Restless' },
];

const getTrigger = () => screen.getByRole('combobox');

// The width sizer is the hidden node inside the trigger that carries the option
// labels - the chevron is hidden from assistive technology too, but empty.
const getSizer = () =>
  Array.from(getTrigger().querySelectorAll('[aria-hidden="true"]')).find(
    (element) => element.textContent !== '',
  );

// Ark moves focus onto the option list a few frames after the open transition,
// and a keypress sent before that goes to the trigger instead and is swallowed.
// Waiting on focus rather than on a timer keeps this deterministic.
const waitForOpen = async (listbox: HTMLElement) => {
  await waitFor(() => expect(listbox).toHaveAttribute('data-state', 'open'));
  await waitFor(() => expect(listbox).toHaveFocus());
};

describe('Select', () => {
  it('shows the label of the current value in the trigger', () => {
    render(<Select aria-label="Mood" items={MOODS} value="content" onChange={vi.fn()} />);

    expect(getTrigger()).toHaveTextContent('Content');
  });

  it('shows the placeholder when no option is selected', () => {
    render(
      <Select
        aria-label="Mood"
        items={MOODS}
        value=""
        placeholder="Choose a mood"
        onChange={vi.fn()}
      />,
    );

    expect(getTrigger()).toHaveTextContent('Choose a mood');
  });

  it('renders one row per item when opened', async () => {
    const user = userEvent.setup();
    render(<Select aria-label="Mood" items={MOODS} value="content" onChange={vi.fn()} />);

    await user.click(getTrigger());

    const options = await screen.findAllByRole('option');
    expect(options.map((option) => option.textContent)).toEqual(['Anxious', 'Content', 'Restless']);
  });

  it('calls onChange with the chosen option value', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<Select aria-label="Mood" items={MOODS} value="content" onChange={onChange} />);

    await user.click(getTrigger());
    await user.click(await screen.findByRole('option', { name: 'Restless' }));

    expect(onChange).toHaveBeenCalledWith('restless');
  });

  it('marks the current value as selected in the open list', async () => {
    const user = userEvent.setup();
    render(<Select aria-label="Mood" items={MOODS} value="content" onChange={vi.fn()} />);

    await user.click(getTrigger());

    expect(await screen.findByRole('option', { name: 'Content' })).toHaveAttribute(
      'aria-selected',
      'true',
    );
  });

  it('renders row content from itemSlot, passing the caller its own item', async () => {
    const user = userEvent.setup();
    const items = [
      { value: 'anxious', label: 'Anxious', hint: 'restless and alert' },
      { value: 'content', label: 'Content', hint: 'settled' },
    ];
    render(
      <Select
        aria-label="Mood"
        items={items}
        value="content"
        onChange={vi.fn()}
        itemSlot={(item) => (
          <span>
            {item.label} - {item.hint}
          </span>
        )}
      />,
    );

    await user.click(getTrigger());

    expect(await screen.findByText('Anxious - restless and alert')).toBeInTheDocument();
  });

  it('does not select a disabled option', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <Select
        aria-label="Mood"
        items={[...MOODS.slice(0, 2), { value: 'restless', label: 'Restless', disabled: true }]}
        value="content"
        onChange={onChange}
      />,
    );

    await user.click(getTrigger());
    await user.click(await screen.findByRole('option', { name: 'Restless' }));

    expect(onChange).not.toHaveBeenCalled();
  });

  it('opens, moves and chooses with the keyboard', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<Select aria-label="Mood" items={MOODS} value="anxious" onChange={onChange} />);

    getTrigger().focus();
    await user.keyboard('{Enter}');
    const listbox = await screen.findByRole('listbox');
    await waitForOpen(listbox);

    await user.keyboard('{ArrowDown}');
    await waitFor(() =>
      expect(listbox).toHaveAttribute(
        'aria-activedescendant',
        screen.getByRole('option', { name: 'Content' }).id,
      ),
    );

    await user.keyboard('{Enter}');
    expect(onChange).toHaveBeenCalledWith('content');
  });

  it('dismisses on Escape', async () => {
    const user = userEvent.setup();
    render(<Select aria-label="Mood" items={MOODS} value="anxious" onChange={vi.fn()} />);

    await user.click(getTrigger());
    const listbox = await screen.findByRole('listbox');
    await waitForOpen(listbox);

    await user.keyboard('{Escape}');
    await waitFor(() => expect(listbox).toHaveAttribute('data-state', 'closed'));
  });

  it('names the control from its accessible label', () => {
    render(<Select aria-label="Mood" items={MOODS} value="content" onChange={vi.fn()} />);

    expect(screen.getByRole('combobox', { name: 'Mood' })).toBeInTheDocument();
  });

  it('reserves the width of its widest option without exposing it to assistive tech', () => {
    render(<Select aria-label="Mood" items={MOODS} value="content" onChange={vi.fn()} />);

    const sizer = getSizer();
    expect(sizer).toBeDefined();
    MOODS.forEach((mood) => {
      expect(sizer).toHaveTextContent(mood.label);
    });
    expect(getTrigger()).toHaveAccessibleName('Mood');
  });

  it('omits the width sizer when fitWidest is off', () => {
    render(
      <Select
        aria-label="Mood"
        items={MOODS}
        value="content"
        fitWidest={false}
        onChange={vi.fn()}
      />,
    );

    expect(getSizer()).toBeUndefined();
  });

  it('turns its chevron over while the list is open', async () => {
    const user = userEvent.setup();
    render(<Select aria-label="Mood" items={MOODS} value="content" onChange={vi.fn()} />);

    const chevron = getTrigger().querySelector('[data-part="indicator"]');
    expect(chevron).toHaveAttribute('data-state', 'closed');

    await user.click(getTrigger());

    await waitFor(() => expect(chevron).toHaveAttribute('data-state', 'open'));
  });
});
