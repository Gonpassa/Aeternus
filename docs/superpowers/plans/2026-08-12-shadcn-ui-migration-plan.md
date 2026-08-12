# shadcn/ui Migration (Buttons, New-Entry Date Picker) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Define the missing shadcn/ui theme tokens, restyle the `Button` primitive to match the design system, wire the new-entry date field to the shared `Calendar` primitive via a new `Popover` primitive, and migrate every native `<button>` call site (and one button-styled `Link`) to `Button`.

**Architecture:** Additive CSS tokens in `client/src/styles.css`'s `@theme` block unlock shadcn's existing `bg-primary`/`bg-destructive`/etc. utility classes. `components/ui/button.tsx`'s `buttonVariants` base/variant classes are edited in place (no new component). A new `components/ui/popover.tsx` is scaffolded following the exact structural pattern already used by `components/ui/select.tsx` (generic Radix wrapper, no hardcoded app colors — call sites restyle via `className`). `EntryForm.tsx` composes `Popover` + `Calendar` + `Button` the same way `JournalCalendarFilter.tsx` already composes `Select` + `MarkedRangeCalendar`. All other call sites swap a native `<button>` for `Button` with an equivalent `variant`.

**Tech Stack:** React 18, TypeScript (strict), Tailwind CSS v4 (`@theme`), shadcn/ui conventions, Radix primitives via the `radix-ui` package, `react-day-picker` (via existing `Calendar`), `date-fns` (already a client dependency, used for date parse/format), Vitest + Testing Library.

## Global Constraints

- Design tokens are **additive only** — do not touch or remove the existing raw palette tokens (`--color-ink-blue`, `--color-moss`, `--color-rust`, `--color-paper`, `--color-paper-card`, `--color-line`) in `client/src/styles.css`.
- `Select`'s existing per-instance `className` overrides in `JournalCalendarFilter.tsx` are untouched — they already work and don't depend on the new tokens.
- No new npm dependency: `Popover` is built on Radix's `Popover`, already available via the installed `radix-ui` package (`^1.6.7`).
- Button font spec: `font-mono text-xs uppercase tracking-[0.04em]`, `rounded-[4px]`, transitions limited to `background-color, border-color` at 150ms, no shadow (per `docs/design/design-system.md`).
- `MoodPicker.tsx`'s mood/emotion toggle-chips and `MarkedRangeCalendar.tsx`'s `DayButton`/nav overrides are explicitly **excluded** from this migration — do not modify them.
- `EntryForm`'s `date` state stays a plain `YYYY-MM-DD` string; no change to `handleSubmit`, `useEntryByDate`, or `CreateEntryRequest`.
- Client lint is ESLint 8.57.1 flat config (Airbnb + typescript-eslint + Prettier) — run `npm run lint --workspace client` before each commit that touches `client/`.

---

## File Structure

- Modify: `client/src/styles.css` — add semantic theme tokens.
- Modify: `client/src/components/ui/button.tsx` — restyle `buttonVariants`.
- Create: `client/src/components/ui/popover.tsx` — generic shadcn `Popover` wrapper (mirrors `select.tsx`'s structure).
- Modify: `client/src/modules/journal/components/EntryForm/EntryForm.tsx` — swap native date input for `Popover` + `Calendar` + `Button` trigger; swap submit `<button>` for `Button`.
- Modify: `client/src/modules/journal/components/EntryForm/EntryForm.test.tsx` — update date-selection interactions for the new popover UI.
- Modify: `client/src/modules/journal/components/JournalCalendarFilter/JournalCalendarFilter.tsx` — swap prev/next/clear-filter `<button>`s for `Button`.
- Modify: `client/src/routes/journal/$entryId.tsx` — swap Edit `Link` styling to `buttonVariants`, Delete/Confirm-delete `<button>`s to `Button`.
- Modify: `client/src/shell/Nav.tsx` — swap Log out `<button>` for `Button`.

---

### Task 1: Theme tokens

**Files:**
- Modify: `client/src/styles.css:3-18` (the `@theme` block)

**Interfaces:**
- Produces: `--color-primary`, `--color-primary-foreground`, `--color-secondary`, `--color-secondary-foreground`, `--color-destructive`, `--color-accent`, `--color-accent-foreground`, `--color-ring`, `--color-background`, `--color-border` — consumed by Task 2 (`button.tsx`) and any shadcn primitive using standard variant classes.

This task has no independent test (it's CSS custom properties, verified visually/indirectly by Task 2's Button rendering). Add the tokens and commit as a single step.

- [ ] **Step 1: Add the semantic tokens to the `@theme` block**

Edit `client/src/styles.css`, inserting the new block right after the existing raw palette tokens and before `--font-display`:

```css
@theme {
  --color-paper: #F3EEE2;
  --color-paper-card: #EAE2CC;
  --color-ink: #232220;
  --color-ink-soft: #5B564C;
  --color-ink-blue: #2C3E52;
  --color-moss: #55684A;
  --color-rust: #A8532F;
  --color-line: #D8CFB8;
  --color-mood-anxious: #B98A2E;
  --color-mood-angry: #7A2E1E;

  --color-primary: var(--color-ink-blue);
  --color-primary-foreground: var(--color-paper);
  --color-secondary: transparent;
  --color-secondary-foreground: var(--color-ink-blue);
  --color-destructive: var(--color-rust);
  --color-accent: var(--color-moss);
  --color-accent-foreground: var(--color-paper);
  --color-ring: var(--color-moss);
  --color-background: var(--color-paper-card);
  --color-border: var(--color-line);

  --font-display: 'Fraunces', ui-serif, serif;
  --font-body: 'Newsreader', ui-serif, serif;
  --font-mono: 'IBM Plex Mono', ui-monospace, monospace;
}
```

- [ ] **Step 2: Build the client to confirm the CSS compiles**

Run: `npm run build --workspace client`
Expected: builds cleanly (Tailwind v4 accepts `var()` references inside `@theme` — this is the same pattern already used for `--font-display` etc.).

- [ ] **Step 3: Commit**

```bash
git add client/src/styles.css
git commit -m "feat(client): add semantic theme tokens for shadcn/ui variants"
```

---

### Task 2: Restyle the `Button` primitive

**Files:**
- Modify: `client/src/components/ui/button.tsx`
- Modify: `client/src/components/ui/calendar.tsx` (only if Step 3's manual check finds a regression — see below)

**Interfaces:**
- Consumes: theme tokens from Task 1.
- Produces: `Button` component and `buttonVariants` function (unchanged signature — `variant: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link'`, `size: 'default' | 'xs' | 'sm' | 'lg' | 'icon' | 'icon-xs' | 'icon-sm' | 'icon-lg'`), consumed by every later task.

This is a pure restyle — no test file exists for `Button` (it's a primitive with no app logic), so verification is: (a) existing test suites for `Calendar`/`MarkedRangeCalendar` still pass since they render `Button` internally, and (b) a manual visual check.

- [ ] **Step 1: Run the existing Calendar-related test suites as a baseline**

Run: `npx vitest run src/components/MarkedRangeCalendar --workspace client` (from `client/`: `npx vitest run src/components/MarkedRangeCalendar`)
Expected: all passing (baseline before the restyle).

- [ ] **Step 2: Edit `buttonVariants` in `client/src/components/ui/button.tsx`**

Replace the whole `cva(...)` call with:

```tsx
const buttonVariants = cva(
  "inline-flex shrink-0 items-center justify-center gap-2 rounded-[4px] font-mono text-xs uppercase tracking-[0.04em] whitespace-nowrap transition-[background-color,border-color] duration-150 ease-out outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-destructive/20 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        default: 'bg-primary text-primary-foreground hover:bg-primary/90',
        destructive: 'bg-destructive text-paper hover:bg-destructive/90',
        outline: 'border border-primary bg-transparent text-primary hover:bg-primary/5',
        secondary: 'border border-primary bg-transparent text-primary hover:bg-primary/5',
        ghost: 'text-accent hover:underline',
        link: 'text-accent underline-offset-4 hover:underline',
      },
      size: {
        default: 'h-9 px-4 py-2 has-[>svg]:px-3',
        xs: "h-6 gap-1 px-2 text-xs has-[>svg]:px-1.5 [&_svg:not([class*='size-'])]:size-3",
        sm: 'h-8 gap-1.5 px-3 has-[>svg]:px-2.5',
        lg: 'h-10 px-6 has-[>svg]:px-4',
        icon: 'size-9',
        'icon-xs': "size-6 [&_svg:not([class*='size-'])]:size-3",
        'icon-sm': 'size-8',
        'icon-lg': 'size-10',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  },
);
```

Leave the `Button` function itself, its props, and the `export` line unchanged.

- [ ] **Step 3: Re-run the Calendar-related test suites**

Run (from `client/`): `npx vitest run src/components/MarkedRangeCalendar`
Expected: still all passing — `MarkedRangeCalendar` doesn't use `Button`/`buttonVariants` for its day cells (its own `MarkedDayButton` is a raw `<button>`), so this restyle shouldn't affect its logic. This is a regression check, not new coverage.

- [ ] **Step 4: Manual visual check for the plain `Calendar` primitive**

The plain `Calendar` (used directly, not through `MarkedRangeCalendar`) renders its nav chevrons and day cells through `Button`/`buttonVariants`. Since `ghost` now carries a base `text-accent` (moss) instead of no color, unselected day numbers could render moss instead of ink. This primitive is exercised for the first time end-to-end in Task 4 (new-entry date popover) — defer the actual visual confirmation to Task 4's manual click-through, but if unselected day text renders moss instead of a neutral ink tone, fix it there by adding an explicit `text-ink` class to `CalendarDayButton`'s `className` in `client/src/components/ui/calendar.tsx` (its `cn(...)` call already composes a large override string — prepend `'text-ink'` to that string so it sits ahead of the state-conditional `data-[...]:text-primary-foreground` overrides, which still win when their condition is active).

- [ ] **Step 5: Lint**

Run (from `client/`): `npm run lint`
Expected: no new errors.

- [ ] **Step 6: Commit**

```bash
git add client/src/components/ui/button.tsx
git commit -m "feat(client): restyle Button primitive to match design system"
```

---

### Task 3: Scaffold the `Popover` primitive

**Files:**
- Create: `client/src/components/ui/popover.tsx`

**Interfaces:**
- Consumes: `cn` from `client/src/lib/utils.ts` (already exists), Radix's `Popover` namespace from the `radix-ui` package (already a dependency).
- Produces: `Popover`, `PopoverTrigger`, `PopoverContent`, `PopoverAnchor` — consumed by Task 4.

This is a generic scaffold with no app logic (mirrors `select.tsx`'s shape exactly), so there's no unit test for it in isolation — it's exercised through Task 4's `EntryForm` tests.

- [ ] **Step 1: Create `client/src/components/ui/popover.tsx`**

```tsx
/* eslint-disable react/jsx-props-no-spreading --
   shadcn/ui's generated Popover primitive forwards remaining Radix props via
   `{...props}`, matching the pattern used by ui/select.tsx. */
import * as React from 'react';
import { Popover as PopoverPrimitive } from 'radix-ui';

import { cn } from '@/lib/utils';

function Popover({ ...props }: React.ComponentProps<typeof PopoverPrimitive.Root>) {
  return <PopoverPrimitive.Root data-slot="popover" {...props} />;
}

function PopoverTrigger({ ...props }: React.ComponentProps<typeof PopoverPrimitive.Trigger>) {
  return <PopoverPrimitive.Trigger data-slot="popover-trigger" {...props} />;
}

function PopoverAnchor({ ...props }: React.ComponentProps<typeof PopoverPrimitive.Anchor>) {
  return <PopoverPrimitive.Anchor data-slot="popover-anchor" {...props} />;
}

function PopoverContent({
  className,
  align = 'center',
  sideOffset = 4,
  ...props
}: React.ComponentProps<typeof PopoverPrimitive.Content>) {
  return (
    <PopoverPrimitive.Portal>
      <PopoverPrimitive.Content
        data-slot="popover-content"
        align={align}
        sideOffset={sideOffset}
        className={cn(
          'z-50 w-auto rounded-md border bg-popover p-4 text-popover-foreground shadow-md outline-hidden data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2',
          className,
        )}
        {...props}
      />
    </PopoverPrimitive.Portal>
  );
}

export { Popover, PopoverTrigger, PopoverContent, PopoverAnchor };
```

Note: like `select.tsx`, this leaves `bg-popover`/`text-popover-foreground` as generic (undefined) tokens — call sites restyle via `className`, same as `JournalCalendarFilter.tsx` does for `SelectContent`.

- [ ] **Step 2: Typecheck**

Run (from `client/`): `npx tsc -b`
Expected: no errors (file isn't imported anywhere yet, so this just confirms the file itself is valid TS).

- [ ] **Step 3: Commit**

```bash
git add client/src/components/ui/popover.tsx
git commit -m "feat(client): scaffold shadcn/ui Popover primitive"
```

---

### Task 4: Wire the new-entry date field to `Popover` + `Calendar`, and migrate the submit button

**Files:**
- Modify: `client/src/modules/journal/components/EntryForm/EntryForm.tsx`
- Modify: `client/src/modules/journal/components/EntryForm/EntryForm.test.tsx`

**Interfaces:**
- Consumes: `Button` (Task 2), `Popover`/`PopoverTrigger`/`PopoverContent` (Task 3), `Calendar` (`client/src/components/ui/calendar.tsx`, unchanged signature: `mode="single"`, `selected?: Date`, `onSelect?: (date: Date | undefined) => void`), `date-fns`'s `format`/`parse` (already a client dependency).
- Produces: no new exports — `EntryFormProps` is unchanged.

- [ ] **Step 1: Write/update the failing tests for the new date-picker interaction**

Replace the whole contents of `client/src/modules/journal/components/EntryForm/EntryForm.test.tsx` with:

```tsx
import { describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import type { Entry } from '@nee3/shared-types';

vi.mock('../RichTextEditor/RichTextEditor.tsx', () => ({
  RichTextEditor: ({ value, onChange }: { value: string; onChange: (html: string) => void }) => (
    <textarea aria-label="Content" value={value} onChange={(e) => onChange(e.target.value)} />
  ),
}));

const mockUseEntryByDate = vi.fn();
vi.mock('../../api/journalHooks.ts', () => ({
  useEntryByDate: (date: string | null) => mockUseEntryByDate(date),
}));

const { EntryForm } = await import('./EntryForm.tsx');

const existingEntry: Entry = {
  id: 42,
  userId: 1,
  date: '2026-08-01',
  title: 'Existing title',
  primaryMood: 'calm',
  specificEmotion: 'peaceful',
  content: '<p>Existing content</p>',
  createdAt: '2026-08-01T00:00:00.000Z',
  updatedAt: '2026-08-01T00:00:00.000Z',
};

// Opens the date popover and clicks the day matching the given YYYY-MM-DD string.
// The popover portals into document.body (outside the render container), and
// Calendar's own day buttons carry a `data-day` attribute set to
// `date.toLocaleDateString()` (see ui/calendar.tsx's CalendarDayButton) - the
// same query shape MarkedRangeCalendar.test.tsx uses via `data-iso`.
const selectDate = async (iso: string) => {
  fireEvent.click(screen.getByLabelText(/date/i));
  const [year, month, day] = iso.split('-').map(Number);
  const target = new Date(year, month - 1, day);
  const dayButton = await waitFor(() => {
    const el = document.body.querySelector(`[data-day="${target.toLocaleDateString()}"]`);
    if (!el) throw new Error(`No day button for ${iso}`);
    return el as HTMLElement;
  });
  fireEvent.click(dayButton);
};

describe('EntryForm date-collision', () => {
  it('switches into edit mode and pre-fills the form when the chosen date already has an entry', async () => {
    mockUseEntryByDate.mockImplementation((date: string | null) => ({
      data: date === '2026-08-01' ? existingEntry : null,
    }));
    const handleSubmit = vi.fn().mockResolvedValue(undefined);
    render(<EntryForm onSubmit={handleSubmit} />);

    await selectDate('2026-08-01');

    await waitFor(() => {
      expect(screen.getByLabelText(/title/i)).toHaveValue('Existing title');
    });
    expect(screen.getByText(/editing it instead/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('radio', { name: /calm/i }));
    fireEvent.click(screen.getByRole('radio', { name: 'peaceful' }));
    fireEvent.click(screen.getByRole('button', { name: /save entry/i }));

    await waitFor(() => {
      expect(handleSubmit).toHaveBeenCalledWith(
        expect.objectContaining({ date: '2026-08-01', title: 'Existing title' }),
        42,
      );
    });
  });

  it('clears the pre-filled fields when the date changes away from a collision', async () => {
    mockUseEntryByDate.mockImplementation((date: string | null) => ({
      data: date === '2026-08-01' ? existingEntry : null,
    }));
    const handleSubmit = vi.fn().mockResolvedValue(undefined);
    render(<EntryForm onSubmit={handleSubmit} />);

    await selectDate('2026-08-01');

    await waitFor(() => {
      expect(screen.getByLabelText(/title/i)).toHaveValue('Existing title');
    });
    expect(screen.getByRole('radio', { name: /calm/i })).toHaveAttribute('aria-checked', 'true');

    await selectDate('2026-08-05');

    await waitFor(() => {
      expect(screen.getByLabelText(/title/i)).toHaveValue('');
    });
    expect(screen.getByLabelText(/content/i)).toHaveValue('');
    expect(screen.getByRole('radio', { name: /calm/i })).toHaveAttribute('aria-checked', 'false');
    expect(screen.queryByRole('radiogroup', { name: /specific emotion/i })).not.toBeInTheDocument();
    expect(screen.queryByText(/editing it instead/i)).not.toBeInTheDocument();
  });

  it('does not clear a user-typed title while the collision lookup is still loading', async () => {
    mockUseEntryByDate.mockImplementation(() => ({ data: null, isLoading: false }));
    const handleSubmit = vi.fn().mockResolvedValue(undefined);
    const { rerender } = render(<EntryForm onSubmit={handleSubmit} />);

    fireEvent.change(screen.getByLabelText(/title/i), { target: { value: 'My draft title' } });
    expect(screen.getByLabelText(/title/i)).toHaveValue('My draft title');

    mockUseEntryByDate.mockImplementation(() => ({ data: undefined, isLoading: true }));
    await selectDate('2026-09-09');
    rerender(<EntryForm onSubmit={handleSubmit} />);

    expect(screen.getByLabelText(/title/i)).toHaveValue('My draft title');

    mockUseEntryByDate.mockImplementation(() => ({ data: null, isLoading: false }));
    rerender(<EntryForm onSubmit={handleSubmit} />);

    await waitFor(() => {
      expect(screen.getByLabelText(/title/i)).toHaveValue('My draft title');
    });
  });

  it('submits a plain create when no colliding entry exists', async () => {
    mockUseEntryByDate.mockReturnValue({ data: null });
    const handleSubmit = vi.fn().mockResolvedValue(undefined);
    render(<EntryForm onSubmit={handleSubmit} />);

    fireEvent.change(screen.getByLabelText(/title/i), { target: { value: 'New entry' } });
    fireEvent.click(screen.getByRole('radio', { name: /happy/i }));
    fireEvent.click(screen.getByRole('radio', { name: 'content' }));
    fireEvent.click(screen.getByRole('button', { name: /save entry/i }));

    await waitFor(() => {
      expect(handleSubmit).toHaveBeenCalledWith(
        expect.objectContaining({ title: 'New entry' }),
        undefined,
      );
    });
  });

  it('saves successfully with a primary mood but no specific emotion', async () => {
    mockUseEntryByDate.mockReturnValue({ data: null });
    const handleSubmit = vi.fn().mockResolvedValue(undefined);
    render(<EntryForm onSubmit={handleSubmit} />);

    fireEvent.change(screen.getByLabelText(/title/i), { target: { value: 'No specific mood' } });
    fireEvent.click(screen.getByRole('radio', { name: /happy/i }));
    fireEvent.click(screen.getByRole('button', { name: /save entry/i }));

    await waitFor(() => {
      expect(handleSubmit).toHaveBeenCalledWith(
        expect.objectContaining({ primaryMood: 'happy', specificEmotion: null }),
        undefined,
      );
    });
  });

  it('disables the date trigger in edit mode', () => {
    mockUseEntryByDate.mockReturnValue({ data: null });
    render(<EntryForm initialEntry={existingEntry} onSubmit={vi.fn()} />);

    expect(screen.getByLabelText(/date/i)).toBeDisabled();
  });
});
```

- [ ] **Step 2: Run the test file to confirm it fails against the current native `<input type="date">` implementation**

Run (from `client/`): `npx vitest run src/modules/journal/components/EntryForm/EntryForm.test.tsx`
Expected: FAIL — `selectDate` clicks a label-associated element expecting a popover trigger, but the current implementation renders a native date input, so no `[data-day]` element ever appears and the `waitFor` in `selectDate` times out.

- [ ] **Step 3: Replace the date field and submit button in `EntryForm.tsx`**

Replace the full contents of `client/src/modules/journal/components/EntryForm/EntryForm.tsx` with:

```tsx
import { FormEvent, useEffect, useRef, useState } from 'react';
import { format, parse } from 'date-fns';
import type { CreateEntryRequest, Entry, PrimaryMood, SpecificEmotion } from '@nee3/shared-types';
import { useEntryByDate } from '../../api/journalHooks.ts';
import { MoodPicker } from '../MoodPicker/MoodPicker.tsx';
import { RichTextEditor } from '../RichTextEditor/RichTextEditor.tsx';
import { Button } from '../../../../components/ui/button.tsx';
import { Calendar } from '../../../../components/ui/calendar.tsx';
import { Popover, PopoverContent, PopoverTrigger } from '../../../../components/ui/popover.tsx';

const todayIsoDate = (): string => new Date().toISOString().slice(0, 10);
const parseIsoDate = (iso: string): Date => parse(iso, 'yyyy-MM-dd', new Date());

export interface EntryFormProps {
  initialEntry?: Entry;
  onSubmit: (input: CreateEntryRequest, existingEntryId?: number) => Promise<void>;
}

export function EntryForm({ initialEntry, onSubmit }: EntryFormProps) {
  const [date, setDate] = useState(initialEntry?.date ?? todayIsoDate());
  const [datePopoverOpen, setDatePopoverOpen] = useState(false);
  const [title, setTitle] = useState(initialEntry?.title ?? '');
  const [primaryMood, setPrimaryMood] = useState<PrimaryMood | null>(
    initialEntry?.primaryMood ?? null,
  );
  const [specificEmotion, setSpecificEmotion] = useState<SpecificEmotion | null>(
    initialEntry?.specificEmotion ?? null,
  );
  const [content, setContent] = useState(initialEntry?.content ?? '');
  const [error, setError] = useState<string | null>(null);

  // Only look up by-date collisions in create mode; an edit route already has its entry.
  const collisionLookupDate = initialEntry ? null : date;
  const { data: collidingEntry, isLoading: collisionLookupLoading } =
    useEntryByDate(collisionLookupDate);
  // Tracks whether the form's fields are currently populated from a fetched collision,
  // so we only clear them once that collision is confirmed gone - never merely because
  // the lookup is loading or resolved to "no collision" for data the user typed themselves.
  const prefilledFromCollisionId = useRef<number | null>(null);

  useEffect(() => {
    if (collisionLookupLoading) {
      // The collision lookup for the current date is still in flight; `collidingEntry`
      // is momentarily `undefined` here even though no collision has been ruled out yet.
      // Don't clear user-typed data based on this transient state.
      return;
    }
    if (collidingEntry) {
      prefilledFromCollisionId.current = collidingEntry.id;
      setTitle(collidingEntry.title);
      setPrimaryMood(collidingEntry.primaryMood);
      setSpecificEmotion(collidingEntry.specificEmotion);
      setContent(collidingEntry.content);
    } else if (!initialEntry && prefilledFromCollisionId.current !== null) {
      prefilledFromCollisionId.current = null;
      setTitle('');
      setPrimaryMood(null);
      setSpecificEmotion(null);
      setContent('');
    }
  }, [collidingEntry, collisionLookupLoading, initialEntry]);

  const existingEntryId = initialEntry?.id ?? collidingEntry?.id;

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    if (!primaryMood) {
      setError('Please choose a mood.');
      return;
    }
    try {
      await onSubmit({ date, title, primaryMood, specificEmotion, content }, existingEntryId);
    } catch {
      setError('Could not save this entry.');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex max-w-2xl flex-col gap-4">
      {existingEntryId && !initialEntry && (
        <p className="font-mono text-xs uppercase text-rust">
          An entry already exists for this date &mdash; editing it instead.
        </p>
      )}
      <label className="flex flex-col gap-1 font-mono text-xs uppercase" htmlFor="entry-date">
        Date
        <Popover open={datePopoverOpen} onOpenChange={setDatePopoverOpen}>
          <PopoverTrigger asChild>
            <Button
              id="entry-date"
              type="button"
              variant="outline"
              className="w-fit justify-start font-sans normal-case"
              disabled={Boolean(initialEntry)}
            >
              {format(parseIsoDate(date), 'MMM d, yyyy')}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto border-line bg-paper-card p-2" align="start">
            <Calendar
              mode="single"
              selected={parseIsoDate(date)}
              onSelect={(selected) => {
                if (!selected) return;
                setDate(format(selected, 'yyyy-MM-dd'));
                setDatePopoverOpen(false);
              }}
            />
          </PopoverContent>
        </Popover>
      </label>
      <label className="flex flex-col gap-1 font-mono text-xs uppercase" htmlFor="entry-title">
        Title
        <input
          id="entry-title"
          className="border border-line bg-paper-card p-2 font-sans normal-case"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
        />
      </label>
      <MoodPicker
        primaryMood={primaryMood}
        specificEmotion={specificEmotion}
        onChange={({ primaryMood: p, specificEmotion: s }) => {
          setPrimaryMood(p);
          setSpecificEmotion(s);
        }}
      />
      <RichTextEditor value={content} onChange={setContent} placeholder="Write today's entry..." />
      {error && <p className="text-rust">{error}</p>}
      <Button type="submit">Save entry</Button>
    </form>
  );
}
```

- [ ] **Step 4: Run the test file again**

Run (from `client/`): `npx vitest run src/modules/journal/components/EntryForm/EntryForm.test.tsx`
Expected: PASS. If `selectDate`'s `waitFor` still can't find `[data-day]`, check with `screen.debug(document.body)` whether the Popover actually opened (Radix `PopoverTrigger` needs the underlying `Button` to receive the click — since `asChild` is set, Radix's `Slot` should forward `onClick` correctly; if not, drop `asChild` and let `PopoverTrigger` render its own default `<button>` styled via `buttonVariants({ variant: 'outline' })` passed through `className` instead).

- [ ] **Step 5: Run the full client test suite for regressions**

Run (from `client/`): `npm test`
Expected: all suites pass, including `MoodPicker`, `JournalCalendarFilter`, `MarkedRangeCalendar`.

- [ ] **Step 6: Lint and typecheck**

Run (from `client/`): `npm run lint && npx tsc -b`
Expected: no errors.

- [ ] **Step 7: Commit**

```bash
git add client/src/modules/journal/components/EntryForm/EntryForm.tsx client/src/modules/journal/components/EntryForm/EntryForm.test.tsx
git commit -m "feat(client): wire new-entry date field to shared Calendar via Popover"
```

---

### Task 5: Migrate `JournalCalendarFilter.tsx` buttons

**Files:**
- Modify: `client/src/modules/journal/components/JournalCalendarFilter/JournalCalendarFilter.tsx`
- Test: `client/src/modules/journal/components/JournalCalendarFilter/JournalCalendarFilter.test.tsx` (existing tests already cover "Clear filter" visibility by text — no new test needed, this task is a regression check against them)

**Interfaces:**
- Consumes: `Button` (Task 2).

- [ ] **Step 1: Run the existing test file as a baseline**

Run (from `client/`): `npx vitest run src/modules/journal/components/JournalCalendarFilter/JournalCalendarFilter.test.tsx`
Expected: passing (baseline before the change).

- [ ] **Step 2: Swap the prev/next month arrows and clear-filter button**

In `client/src/modules/journal/components/JournalCalendarFilter/JournalCalendarFilter.tsx`, add the import:

```tsx
import { Button } from '../../../../components/ui/button.tsx';
```

Replace the "Previous month" button:

```tsx
<Button
  type="button"
  variant="outline"
  size="icon-sm"
  aria-label="Previous month"
  onClick={() => setVisibleMonth(addMonths(visibleMonth, -1))}
>
  &lsaquo;
</Button>
```

Replace the "Next month" button:

```tsx
<Button
  type="button"
  variant="outline"
  size="icon-sm"
  aria-label="Next month"
  onClick={() => setVisibleMonth(addMonths(visibleMonth, 1))}
>
  &rsaquo;
</Button>
```

Replace the "Clear filter" button:

```tsx
<Button type="button" variant="link" onClick={() => onRangeChange({})}>
  Clear filter
</Button>
```

- [ ] **Step 3: Re-run the test file**

Run (from `client/`): `npx vitest run src/modules/journal/components/JournalCalendarFilter/JournalCalendarFilter.test.tsx`
Expected: PASS (the tests query by text/`data-iso`, not by the native `<button>` tag, so this should be a no-op for them).

- [ ] **Step 4: Lint**

Run (from `client/`): `npm run lint`
Expected: no new errors.

- [ ] **Step 5: Commit**

```bash
git add client/src/modules/journal/components/JournalCalendarFilter/JournalCalendarFilter.tsx
git commit -m "feat(client): migrate JournalCalendarFilter buttons to Button primitive"
```

---

### Task 6: Migrate `routes/journal/$entryId.tsx`

**Files:**
- Modify: `client/src/routes/journal/$entryId.tsx`

**Interfaces:**
- Consumes: `Button`, `buttonVariants` (Task 2), `cn` from `client/src/lib/utils.ts`.

There's no existing test file for this route component; verification is lint + typecheck + the manual click-through in Task 8.

- [ ] **Step 1: Edit `client/src/routes/journal/$entryId.tsx`**

Add imports:

```tsx
import { Button, buttonVariants } from '../../components/ui/button.tsx';
import { cn } from '../../lib/utils.ts';
```

Replace the "Edit" `Link`:

```tsx
<Link
  to="/journal/$entryId/edit"
  params={{ entryId }}
  className={cn(buttonVariants({ variant: 'outline' }))}
>
  Edit
</Link>
```

Replace the "Delete"/"Confirm delete" block:

```tsx
{confirmingDelete ? (
  <Button type="button" variant="destructive" onClick={handleDelete}>
    Confirm delete
  </Button>
) : (
  <Button
    type="button"
    variant="outline"
    className="border-rust text-rust hover:bg-rust/5"
    onClick={() => setConfirmingDelete(true)}
  >
    Delete
  </Button>
)}
```

- [ ] **Step 2: Lint and typecheck**

Run (from `client/`): `npm run lint && npx tsc -b`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add client/src/routes/journal/\$entryId.tsx
git commit -m "feat(client): migrate entry detail Edit/Delete controls to Button primitive"
```

---

### Task 7: Migrate `shell/Nav.tsx`

**Files:**
- Modify: `client/src/shell/Nav.tsx`

**Interfaces:**
- Consumes: `Button` (Task 2).

No existing test file for `Nav.tsx`; verification is lint + typecheck + the manual click-through in Task 8.

- [ ] **Step 1: Edit `client/src/shell/Nav.tsx`**

Add the import:

```tsx
import { Button } from '../components/ui/button.tsx';
```

Replace the "Log out" button:

```tsx
<Button
  type="button"
  variant="link"
  className="h-auto p-0 text-ink-blue no-underline hover:underline"
  onClick={handleLogout}
>
  Log out
</Button>
```

(`text-ink-blue` overrides `link`'s new `text-accent`/moss default here since the surrounding nav items are all `text-ink-blue` — this keeps "Log out" visually consistent with its `Link` siblings rather than standing out as a low-emphasis moss action.)

- [ ] **Step 2: Lint and typecheck**

Run (from `client/`): `npm run lint && npx tsc -b`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add client/src/shell/Nav.tsx
git commit -m "feat(client): migrate Nav log-out button to Button primitive"
```

---

### Task 8: Full-suite verification and manual click-through

**Files:** none (verification only)

- [ ] **Step 1: Run the full client suite**

Run (from `client/`): `npm run lint && npx tsc -b && npm test`
Expected: all green.

- [ ] **Step 2: Run the full root build**

Run (from repo root): `npm run build`
Expected: builds cleanly (shared-types, then client).

- [ ] **Step 3: Manual click-through in the dev server**

Run (from `client/`): `npm run dev`, then in a browser:
- New-entry form (`/journal/new` or equivalent create route): open the date popover, confirm it's positioned sensibly under the trigger, confirm day-cell text reads ink (not moss) for unselected days per Task 2 Step 4's note — fix `CalendarDayButton` in `calendar.tsx` if it doesn't. Click a day, confirm the popover closes and the trigger label updates. Reload with an existing entry (edit mode) and confirm the trigger is disabled/unclickable.
- `/journal` list: confirm the month/year prev/next arrows and "Clear filter" link render per `design-system.md`'s button spec (mono uppercase, 4px radius, no shadow) and still function.
- An entry detail page: confirm "Edit" (still a `Link`), "Delete", and "Confirm delete" render with the right primary/secondary/destructive treatment and still navigate/delete correctly.
- Nav bar: confirm "Log out" stays inline and vertically aligned with the `Journal`/username text, and still logs out.

Fix anything that looks visually off relative to `docs/design/demo.html` / `design-system.md` before considering this task done.

- [ ] **Step 4: No commit for this task** (verification only — if Step 3 required fixes, commit those under whichever task's file they touched).

---

## Self-Review Notes

- Spec coverage: theme tokens (Task 1), Button restyle (Task 2), Popover scaffold (Task 3), new-entry date field (Task 4), all six button-migration table rows (Tasks 4-7), explicit exclusions respected (MoodPicker and MarkedRangeCalendar's DayButton/nav are never touched), testing section covered (Task 4's rewritten EntryForm tests + Task 8's manual pass).
- The `ghost`/ `link` variant's new moss-default text is a deliberate, spec-directed change with one known ripple effect (Calendar's day-cell/nav text inherited through `buttonVariants`) — Task 2 Step 4 and Task 8 Step 3 carry the explicit check-and-fix instruction rather than silently hoping it looks right.
