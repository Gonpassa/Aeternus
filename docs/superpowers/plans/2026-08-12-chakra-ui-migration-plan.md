# Chakra UI Migration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** Replace Tailwind CSS v4 + shadcn/ui (`cva`/Radix) as the client's styling system with Chakra UI v3, end to end, while preserving `docs/design/design-system.md`'s visual language and all existing behavior/test coverage.

**Architecture:** A single Chakra theme (`client/src/theme.ts`, built via `createSystem`/`defineConfig`) encodes every design token and the button recipe once. Files convert file-by-file, leaf-first (`components/ui/*` → `MarkedRangeCalendar` → journal components → routes → shell), with Tailwind and Chakra coexisting until every `className=` Tailwind usage is gone, at which point Tailwind, `cva`, `clsx`, `tailwind-merge`, and `lib/utils.ts` are removed in one cutover commit.

**Tech Stack:** `@chakra-ui/react` v3 (+ `@emotion/react` peer dep), `react-day-picker` (unchanged, reskinned), Vitest + Testing Library (unchanged), TanStack Router (unchanged).

## Global Constraints

- Chakra UI v3 becomes the **sole** styling system — no partial/coexisting adoption once Phase 3 (Task 8) lands. Source: spec Goals.
- Design tokens must match `docs/design/design-system.md` exactly: colors `paper #F3EEE2`, `paperCard #EAE2CC`, `ink #232220`, `inkSoft #5B564C`, `inkBlue #2C3E52`, `moss #55684A`, `rust #A8532F`, `line #D8CFB8`, `moodAnxious #B98A2E`, `moodAngry #7A2E1E`; fonts `heading` → Fraunces, `body` → Newsreader, `mono` → IBM Plex Mono; shared `radii.md = 4px`. Source: spec Architecture.
- `react-day-picker` remains the calendar engine (not Chakra's native `DatePicker`/`Calendar`) — reskin only, keep `mode="single"`/`selected`/`onSelect` external API. Source: spec Goals, Non-goals.
- No new features, no visual redesign beyond what a like-for-like styling swap requires. Source: spec Non-goals.
- No backend or `shared-types` changes. Source: spec Non-goals.
- Every existing Vitest suite (`EntryForm.test.tsx`, `JournalCalendarFilter.test.tsx`, `MarkedRangeCalendar.test.tsx`, `MoodPicker.test.tsx`, `EntryView.test.tsx`) must keep passing; fix query selectors only if they assumed Radix/Tailwind-specific DOM structure, not for other reasons. Source: spec Testing strategy.
- Task ordering deviates from the spec's Phase 2 list in one place: `components/ui/button.tsx` and `components/ui/calendar.tsx` are merged into a single task (Task 2) because `calendar.tsx` imports `buttonVariants` directly from `button.tsx` — splitting them would leave the repo mid-task in a non-compiling state. `components/ui/select.tsx`/`popover.tsx` (Task 3) and `MarkedRangeCalendar.tsx` (Task 4) remain separate, matching the spec's list.
- Phase 3 cutover (Task 8) only proceeds once `grep -rl "className=" client/src` is empty. Source: spec Migration plan.

---

## Task 1: Foundation — install Chakra, write the theme, wrap the app

**Files:**
- Modify: `client/package.json` (add `@chakra-ui/react`, `@emotion/react`)
- Create: `client/src/theme.ts`
- Modify: `client/src/main.tsx`
- Modify: `client/src/test/setup.ts` (add a `ResizeObserver` stub — Chakra's Ark-UI-based `Popover`/`Select` positioning calls `ResizeObserver`, which jsdom does not implement; without this, Task 3+ tests that open a popover/select will throw `ResizeObserver is not defined`)

**Interfaces:**
- Produces: `export const system` from `client/src/theme.ts` — a Chakra `System` instance, passed to `<ChakraProvider value={system}>`. Every later task's Chakra components resolve tokens (`primary`, `primaryForeground`, `secondary`, `secondaryForeground`, `destructive`, `accent`, `accentForeground`, `ring`, `background`, `border`, `paper`, `paperCard`, `ink`, `inkSoft`, `inkBlue`, `moss`, `rust`, `line`, `moodAnxious`, `moodAngry`, fonts `heading`/`body`/`mono`, `radii.md`) and the `button` recipe from this system.

- [x] **Step 1: Install dependencies**

```bash
cd client
npm install @chakra-ui/react @emotion/react
```

- [x] **Step 2: Write the theme**

Create `client/src/theme.ts`:

```typescript
import { createSystem, defaultConfig, defineConfig, defineRecipe } from '@chakra-ui/react';

const buttonRecipe = defineRecipe({
  base: {
    display: 'inline-flex',
    flexShrink: 0,
    alignItems: 'center',
    justifyContent: 'center',
    gap: '2',
    borderRadius: 'md',
    fontFamily: 'mono',
    fontSize: 'xs',
    textTransform: 'uppercase',
    letterSpacing: '0.04em',
    whiteSpace: 'nowrap',
    transitionProperty: 'background-color, border-color',
    transitionDuration: '150ms',
    transitionTimingFunction: 'ease-out',
    outline: 'none',
    cursor: 'pointer',
    _disabled: { pointerEvents: 'none', opacity: 0.5 },
  },
  variants: {
    variant: {
      default: { bg: 'primary', color: 'primaryForeground', _hover: { bg: 'primary/90' } },
      destructive: { bg: 'destructive', color: 'paper', _hover: { bg: 'destructive/90' } },
      outline: {
        borderWidth: '1px',
        borderColor: 'primary',
        bg: 'transparent',
        color: 'primary',
        _hover: { bg: 'primary/5' },
      },
      secondary: {
        borderWidth: '1px',
        borderColor: 'primary',
        bg: 'transparent',
        color: 'primary',
        _hover: { bg: 'primary/5' },
      },
      ghost: { color: 'accent', _hover: { textDecoration: 'underline' } },
      link: { color: 'accent', textUnderlineOffset: '4px', _hover: { textDecoration: 'underline' } },
    },
    size: {
      default: { h: '9', px: '4', py: '2' },
      xs: { h: '6', gap: '1', px: '2', fontSize: 'xs' },
      sm: { h: '8', gap: '1.5', px: '3' },
      lg: { h: '10', px: '6' },
      icon: { h: '9', w: '9', px: '0' },
      'icon-xs': { h: '6', w: '6', px: '0' },
      'icon-sm': { h: '8', w: '8', px: '0' },
      'icon-lg': { h: '10', w: '10', px: '0' },
    },
  },
  defaultVariants: {
    variant: 'default',
    size: 'default',
  },
});

const config = defineConfig({
  theme: {
    tokens: {
      colors: {
        paper: { value: '#F3EEE2' },
        paperCard: { value: '#EAE2CC' },
        ink: { value: '#232220' },
        inkSoft: { value: '#5B564C' },
        inkBlue: { value: '#2C3E52' },
        moss: { value: '#55684A' },
        rust: { value: '#A8532F' },
        line: { value: '#D8CFB8' },
        moodAnxious: { value: '#B98A2E' },
        moodAngry: { value: '#7A2E1E' },
      },
      fonts: {
        heading: { value: "'Fraunces', ui-serif, serif" },
        body: { value: "'Newsreader', ui-serif, serif" },
        mono: { value: "'IBM Plex Mono', ui-monospace, monospace" },
      },
      radii: {
        md: { value: '4px' },
      },
    },
    semanticTokens: {
      colors: {
        primary: { value: '{colors.inkBlue}' },
        primaryForeground: { value: '{colors.paper}' },
        secondary: { value: 'transparent' },
        secondaryForeground: { value: '{colors.inkBlue}' },
        destructive: { value: '{colors.rust}' },
        accent: { value: '{colors.moss}' },
        accentForeground: { value: '{colors.paper}' },
        ring: { value: '{colors.moss}' },
        background: { value: '{colors.paperCard}' },
        border: { value: '{colors.line}' },
      },
    },
    recipes: {
      button: buttonRecipe,
    },
  },
  globalCss: {
    body: {
      bg: 'paper',
      color: 'ink',
    },
    '.entry-content p': {
      marginBottom: '1em',
    },
    '.entry-content h1, .entry-content h2, .entry-content h3': {
      fontFamily: 'heading',
      marginTop: '1.5em',
      marginBottom: '0.5em',
    },
    '.entry-content ul, .entry-content ol': {
      marginBottom: '1em',
      paddingLeft: '1.5em',
    },
    '.entry-content ul': {
      listStyleType: 'disc',
    },
    '.entry-content ol': {
      listStyleType: 'decimal',
    },
  },
});

export const system = createSystem(defaultConfig, config);
```

This carries forward every rule currently in `client/src/styles.css`'s `@theme` block and the two `.entry-content`/`body` global rules below it — `styles.css` stays in place (still imported, still driving Tailwind) until Task 8 deletes it.

- [x] **Step 3: Wrap the app in `ChakraProvider`**

Edit `client/src/main.tsx`:

```typescript
import { StrictMode } from 'react';
import ReactDOM from 'react-dom/client';
import { RouterProvider, createRouter } from '@tanstack/react-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ChakraProvider } from '@chakra-ui/react';
import { routeTree } from './routeTree.gen';
import { system } from './theme';
import './styles.css';

if (import.meta.env.DEV) {
  // eslint-disable-next-line import/no-extraneous-dependencies -- dev-only tool, never bundled in production
  import('@locator/runtime').then(({ setup }) => setup());
}

const queryClient = new QueryClient();
const router = createRouter({ routeTree, context: { queryClient } });

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}

const rootElement = document.getElementById('root')!;
if (!rootElement.innerHTML) {
  const root = ReactDOM.createRoot(rootElement);
  root.render(
    <StrictMode>
      <ChakraProvider value={system}>
        <QueryClientProvider client={queryClient}>
          <RouterProvider router={router} />
        </QueryClientProvider>
      </ChakraProvider>
    </StrictMode>,
  );
}
```

- [x] **Step 4: Add the `ResizeObserver` test stub**

Edit `client/src/test/setup.ts`:

```typescript
import { afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';

// With `test.globals: false` in vite.config.ts, `afterEach` is not injected
// as a global, so @testing-library/react's automatic cleanup registration
// (which only self-registers when it detects a global `afterEach`) never
// runs. Register it explicitly so renders don't leak across tests in the
// same file.
afterEach(() => {
  cleanup();
});

// jsdom doesn't implement ResizeObserver. Chakra's Popover/Select (built on
// Ark UI + floating-ui) call it to reposition on content resize; without a
// stub, any test that opens one throws "ResizeObserver is not defined".
if (typeof globalThis.ResizeObserver === 'undefined') {
  globalThis.ResizeObserver = class ResizeObserver {
    observe() {}

    unobserve() {}

    disconnect() {}
  };
}
```

- [x] **Step 5: Verify the app still builds and existing tests still pass**

```bash
cd client
npm run lint
npx tsc -b
npm test
npm run build
```

Expected: all pass — no file has been converted yet, so this only proves Chakra installs and initializes cleanly alongside Tailwind.

- [x] **Step 6: Commit**

```bash
git add client/package.json client/package-lock.json client/src/theme.ts client/src/main.tsx client/src/test/setup.ts
git commit -m "feat(client): install Chakra UI and wire up the design-system theme"
```

---

## Task 2: `components/ui/button.tsx` + `components/ui/calendar.tsx`

**Files:**
- Modify: `client/src/components/ui/button.tsx` (rewrite)
- Modify: `client/src/components/ui/calendar.tsx` (rewrite)
- Create: `client/src/components/ui/calendar.module.css`
- Test: `client/src/components/MarkedRangeCalendar/MarkedRangeCalendar.test.tsx`, `client/src/modules/journal/components/EntryForm/EntryForm.test.tsx` (both exercise `Calendar`/`Button` indirectly — run as before/after regression check)

**Interfaces:**
- Consumes: `system` (Task 1) — the `button` recipe registered there drives `<Button variant size>`.
- Produces: `Button` from `client/src/components/ui/button.tsx`, a `React.forwardRef<HTMLButtonElement, ButtonProps>` where `ButtonProps` is `Omit<ChakraButtonProps, 'variant' | 'size'> & { variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link'; size?: 'default' | 'xs' | 'sm' | 'lg' | 'icon' | 'icon-xs' | 'icon-sm' | 'icon-lg' }`. Supports Chakra's `asChild` prop (inherited from `ChakraButtonProps`) — later tasks use `<Button asChild><Link .../></Button>` in place of the old `buttonVariants`+`cn` pattern. **`buttonVariants` no longer exists** — it is not re-exported.
- Produces: `Calendar`, `CalendarDayButton` from `client/src/components/ui/calendar.tsx` — same external props as before (`mode="single"`, `selected`, `onSelect`, `numberOfMonths`, `month`, `onMonthChange`, `disabled`, `showOutsideDays`, `onDayClick`, `formatters`, `classNames`, `components`, `buttonVariant`).

- [x] **Step 1: Rewrite `button.tsx`**

```typescript
import * as React from 'react';
import { Button as ChakraButton, type ButtonProps as ChakraButtonProps } from '@chakra-ui/react';

export type ButtonVariant = 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link';
export type ButtonSize = 'default' | 'xs' | 'sm' | 'lg' | 'icon' | 'icon-xs' | 'icon-sm' | 'icon-lg';

export interface ButtonProps extends Omit<ChakraButtonProps, 'variant' | 'size'> {
  variant?: ButtonVariant;
  size?: ButtonSize;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = 'default', size = 'default', ...props },
  ref,
) {
  return <ChakraButton ref={ref} variant={variant} size={size} {...props} />;
});
```

- [x] **Step 2: Create `calendar.module.css`**

DayPicker's `classNames` prop takes plain class-name strings (not JSX), so it can't consume Chakra style props directly. This scoped CSS module is the fallback the spec calls out for that case — values are hardcoded to the same hex/spacing constants as `theme.ts` so there is one visual source of truth even though there are two files expressing it.

```css
.root {
  width: fit-content;
}
.months {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 1rem;
}
.month {
  display: flex;
  width: 100%;
  flex-direction: column;
  gap: 1rem;
}
.nav {
  position: absolute;
  inset-inline: 0;
  top: 0;
  display: flex;
  width: 100%;
  align-items: center;
  justify-content: space-between;
  gap: 0.25rem;
}
.navButton {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 2rem;
  height: 2rem;
  padding: 0;
  border-radius: 4px;
  color: #55684a;
  user-select: none;
}
.navButton:hover {
  text-decoration: underline;
}
.monthCaption {
  display: flex;
  height: 2rem;
  width: 100%;
  align-items: center;
  justify-content: center;
  padding-inline: 2rem;
}
.dropdowns {
  display: flex;
  height: 2rem;
  width: 100%;
  align-items: center;
  justify-content: center;
  gap: 0.375rem;
  font-size: 0.875rem;
  font-weight: 500;
}
.dropdownRoot {
  position: relative;
  border: 1px solid #d8cfb8;
  border-radius: 4px;
}
.dropdown {
  position: absolute;
  inset: 0;
  background: #eae2cc;
  opacity: 0;
}
.captionLabel {
  font-weight: 500;
  user-select: none;
  font-size: 0.875rem;
}
.monthGrid {
  width: 100%;
  border-collapse: collapse;
}
.weekdays {
  display: flex;
}
.weekday {
  flex: 1;
  border-radius: 4px;
  font-size: 0.8rem;
  font-weight: 400;
  color: #5b564c;
  user-select: none;
}
.week {
  display: flex;
  width: 100%;
  margin-top: 0.5rem;
}
.weekNumberHeader {
  width: 2rem;
  user-select: none;
}
.weekNumber {
  font-size: 0.8rem;
  color: #5b564c;
  user-select: none;
}
.weekNumberCell {
  display: flex;
  height: 2rem;
  width: 2rem;
  align-items: center;
  justify-content: center;
}
.day {
  position: relative;
  aspect-ratio: 1;
  height: 100%;
  width: 100%;
  padding: 0;
  text-align: center;
  user-select: none;
}
.rangeStart {
  border-top-left-radius: 4px;
  border-bottom-left-radius: 4px;
  background: #55684a;
}
.rangeMiddle {
  border-radius: 0;
}
.rangeEnd {
  border-top-right-radius: 4px;
  border-bottom-right-radius: 4px;
  background: #55684a;
}
.today {
  border-radius: 4px;
  background: #55684a;
  color: #f3eee2;
}
.outside {
  color: #5b564c;
}
.disabled {
  color: #5b564c;
  opacity: 0.5;
}
.hidden {
  visibility: hidden;
}
.dayButton {
  display: flex;
  aspect-ratio: 1;
  height: auto;
  width: 100%;
  min-width: 2rem;
  flex-direction: column;
  gap: 0.25rem;
  line-height: 1;
}
```

- [x] **Step 3: Rewrite `calendar.tsx`**

```typescript
'use client';

import * as React from 'react';
import { Box } from '@chakra-ui/react';
import { ChevronDownIcon, ChevronLeftIcon, ChevronRightIcon } from 'lucide-react';
import { DayPicker, getDefaultClassNames, type DayButton } from 'react-day-picker';

import { Button, type ButtonProps } from '@/components/ui/button';
import styles from './calendar.module.css';

function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  captionLayout = 'label',
  buttonVariant = 'ghost',
  formatters,
  components,
  ...props
}: React.ComponentProps<typeof DayPicker> & {
  buttonVariant?: ButtonProps['variant'];
}) {
  const defaultClassNames = getDefaultClassNames();

  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      className={[styles.root, className].filter(Boolean).join(' ')}
      captionLayout={captionLayout}
      formatters={{
        formatMonthDropdown: (date) => date.toLocaleString('default', { month: 'short' }),
        ...formatters,
      }}
      classNames={{
        root: [styles.root, defaultClassNames.root].join(' '),
        months: [styles.months, defaultClassNames.months].join(' '),
        month: [styles.month, defaultClassNames.month].join(' '),
        nav: [styles.nav, defaultClassNames.nav].join(' '),
        button_previous: [styles.navButton, defaultClassNames.button_previous].join(' '),
        button_next: [styles.navButton, defaultClassNames.button_next].join(' '),
        month_caption: [styles.monthCaption, defaultClassNames.month_caption].join(' '),
        dropdowns: [styles.dropdowns, defaultClassNames.dropdowns].join(' '),
        dropdown_root: [styles.dropdownRoot, defaultClassNames.dropdown_root].join(' '),
        dropdown: [styles.dropdown, defaultClassNames.dropdown].join(' '),
        caption_label: [styles.captionLabel, defaultClassNames.caption_label].join(' '),
        month_grid: [styles.monthGrid, defaultClassNames.month_grid].join(' '),
        weekdays: [styles.weekdays, defaultClassNames.weekdays].join(' '),
        weekday: [styles.weekday, defaultClassNames.weekday].join(' '),
        week: [styles.week, defaultClassNames.week].join(' '),
        week_number_header: [styles.weekNumberHeader, defaultClassNames.week_number_header].join(' '),
        week_number: [styles.weekNumber, defaultClassNames.week_number].join(' '),
        day: [styles.day, defaultClassNames.day].join(' '),
        range_start: [styles.rangeStart, defaultClassNames.range_start].join(' '),
        range_middle: [styles.rangeMiddle, defaultClassNames.range_middle].join(' '),
        range_end: [styles.rangeEnd, defaultClassNames.range_end].join(' '),
        today: [styles.today, defaultClassNames.today].join(' '),
        outside: [styles.outside, defaultClassNames.outside].join(' '),
        disabled: [styles.disabled, defaultClassNames.disabled].join(' '),
        hidden: [styles.hidden, defaultClassNames.hidden].join(' '),
        ...classNames,
      }}
      components={{
        Root: ({ className: rootClassName, rootRef, ...rootProps }) => (
          <div data-slot="calendar" ref={rootRef} className={rootClassName} {...rootProps} />
        ),
        Chevron: ({ className: chevronClassName, orientation, ...chevronProps }) => {
          if (orientation === 'left') {
            return <ChevronLeftIcon className={chevronClassName} {...chevronProps} />;
          }
          if (orientation === 'right') {
            return <ChevronRightIcon className={chevronClassName} {...chevronProps} />;
          }
          return <ChevronDownIcon className={chevronClassName} {...chevronProps} />;
        },
        DayButton: CalendarDayButton,
        WeekNumber: ({ children, ...weekNumberProps }) => (
          <td {...weekNumberProps}>
            <Box
              display="flex"
              alignItems="center"
              justifyContent="center"
              className={styles.weekNumberCell}
            >
              {children}
            </Box>
          </td>
        ),
        ...components,
      }}
      {...props}
    />
  );
}

function CalendarDayButton({
  className,
  day,
  modifiers,
  ...props
}: React.ComponentProps<typeof DayButton>) {
  const ref = React.useRef<HTMLButtonElement>(null);
  React.useEffect(() => {
    if (modifiers.focused) ref.current?.focus();
  }, [modifiers.focused]);

  return (
    <Button
      ref={ref}
      variant="ghost"
      size="icon"
      data-day={day.date.toLocaleDateString()}
      data-selected-single={
        modifiers.selected &&
        !modifiers.range_start &&
        !modifiers.range_end &&
        !modifiers.range_middle
      }
      data-range-start={modifiers.range_start}
      data-range-end={modifiers.range_end}
      data-range-middle={modifiers.range_middle}
      className={[styles.dayButton, className].filter(Boolean).join(' ')}
      fontWeight="normal"
      color="ink"
      css={{
        '&[data-range-start=true], &[data-range-end=true], &[data-selected-single=true]': {
          bg: 'primary',
          color: 'primaryForeground',
        },
        '&[data-range-middle=true]': {
          bg: 'accent',
          color: 'accentForeground',
          borderRadius: '0',
        },
      }}
      {...props}
    />
  );
}

export { Calendar, CalendarDayButton };
```

- [x] **Step 4: Run the regression tests**

```bash
cd client
npx vitest run src/components/MarkedRangeCalendar/MarkedRangeCalendar.test.tsx src/modules/journal/components/EntryForm/EntryForm.test.tsx
npm run lint
npx tsc -b
```

Expected: PASS. `MarkedRangeCalendar.test.tsx` renders `Calendar` indirectly via `MarkedRangeCalendar` (Task 4 hasn't converted that file's own `classNames` yet, but `Calendar`'s external contract — `data-day`, `th[scope="col"]` DOM structure from `react-day-picker` itself — is unaffected by this task).

- [x] **Step 5: Commit**

```bash
git add client/src/components/ui/button.tsx client/src/components/ui/calendar.tsx client/src/components/ui/calendar.module.css
git commit -m "feat(client): migrate Button and Calendar primitives to Chakra"
```

---

## Task 3: `components/ui/select.tsx`, `components/ui/popover.tsx`

**Files:**
- Modify: `client/src/components/ui/select.tsx` (rewrite)
- Modify: `client/src/components/ui/popover.tsx` (rewrite)

**Interfaces:**
- Produces: `Popover`, `PopoverTrigger`, `PopoverContent`, `PopoverAnchor` from `popover.tsx` — same names/roles as before, `PopoverContent` still accepts `align`/`sideOffset`... wait, Chakra's positioning takes a `positioning` prop object rather than flat `align`/`sideOffset`; callers pass Chakra style props (`w`, `borderColor`, `bg`, `p`) directly on `PopoverContent` as before.
- Produces: `Select`, `SelectTrigger`, `SelectValue`, `SelectContent`, `SelectItem`, `createListCollection` (re-exported from `@chakra-ui/react`) from `select.tsx`. **This is an API change from the Radix version**: `Select` now requires a `collection` prop (built with `createListCollection({ items: [{ value, label }, ...] })`), `value`/`onValueChange` work with `string[]` (`details.value[0]` for a single-select), and `SelectItem` takes an `item` prop (`{ value, label }`) instead of a bare `value` string. `JournalCalendarFilter.tsx` (Task 5) is the only caller and is updated to match in that task.

- [x] **Step 1: Rewrite `popover.tsx`**

```typescript
import * as React from 'react';
import { Popover as ChakraPopover, Portal } from '@chakra-ui/react';

function Popover(props: ChakraPopover.RootProps) {
  return <ChakraPopover.Root {...props} />;
}

function PopoverTrigger(props: ChakraPopover.TriggerProps) {
  return <ChakraPopover.Trigger {...props} />;
}

function PopoverAnchor(props: ChakraPopover.AnchorProps) {
  return <ChakraPopover.Anchor {...props} />;
}

const PopoverContent = React.forwardRef<HTMLDivElement, ChakraPopover.ContentProps>(
  function PopoverContent(props, ref) {
    return (
      <Portal>
        <ChakraPopover.Positioner>
          <ChakraPopover.Content
            ref={ref}
            bg="paperCard"
            borderWidth="1px"
            borderColor="line"
            borderRadius="md"
            p="4"
            boxShadow="md"
            {...props}
          />
        </ChakraPopover.Positioner>
      </Portal>
    );
  },
);

export { Popover, PopoverTrigger, PopoverContent, PopoverAnchor };
```

- [x] **Step 2: Rewrite `select.tsx`**

```typescript
import * as React from 'react';
import { Select as ChakraSelect, Portal, createListCollection } from '@chakra-ui/react';

export { createListCollection };

function Select(props: ChakraSelect.RootProps) {
  return <ChakraSelect.Root {...props} />;
}

const SelectTrigger = React.forwardRef<HTMLDivElement, ChakraSelect.ControlProps>(
  function SelectTrigger({ children, ...props }, ref) {
    return (
      <ChakraSelect.Control ref={ref} {...props}>
        <ChakraSelect.Trigger
          borderWidth="1px"
          borderColor="line"
          bg="transparent"
          px="3"
          py="2"
          fontFamily="mono"
          fontSize="xs"
          textTransform="uppercase"
        >
          {children}
        </ChakraSelect.Trigger>
      </ChakraSelect.Control>
    );
  },
);

function SelectValue(props: ChakraSelect.ValueTextProps) {
  return <ChakraSelect.ValueText {...props} />;
}

const SelectContent = React.forwardRef<HTMLDivElement, ChakraSelect.ContentProps>(
  function SelectContent(props, ref) {
    return (
      <Portal>
        <ChakraSelect.Positioner>
          <ChakraSelect.Content
            ref={ref}
            bg="paperCard"
            borderWidth="1px"
            borderColor="line"
            borderRadius="md"
            boxShadow="md"
            p="1"
            {...props}
          />
        </ChakraSelect.Positioner>
      </Portal>
    );
  },
);

function SelectItem({ item, children, ...props }: ChakraSelect.ItemProps) {
  return (
    <ChakraSelect.Item
      item={item}
      px="2"
      py="1.5"
      fontFamily="mono"
      fontSize="xs"
      color="ink"
      _highlighted={{ bg: 'line/60' }}
      {...props}
    >
      <ChakraSelect.ItemText>{children}</ChakraSelect.ItemText>
      <ChakraSelect.ItemIndicator />
    </ChakraSelect.Item>
  );
}

export { Select, SelectTrigger, SelectValue, SelectContent, SelectItem };
```

- [x] **Step 3: Verify build (no callers convert yet, so nothing exercises these at runtime until Task 5)**

```bash
cd client
npm run lint
npx tsc -b
```

Expected: `JournalCalendarFilter.tsx` (not yet converted) still imports the *old* `SelectItem`/`Select` API from this file and will now fail to compile — this is expected and resolved in Task 5, not this task. Confirm the failure is scoped to `JournalCalendarFilter.tsx` only (`npx tsc -b` output should name only that file).

- [x] **Step 4: Commit**

```bash
git add client/src/components/ui/select.tsx client/src/components/ui/popover.tsx
git commit -m "feat(client): migrate Select and Popover primitives to Chakra"
```

---

## Task 4: `components/MarkedRangeCalendar/MarkedRangeCalendar.tsx`

**Files:**
- Modify: `client/src/components/MarkedRangeCalendar/MarkedRangeCalendar.tsx` (rewrite)
- Create: `client/src/components/MarkedRangeCalendar/MarkedRangeCalendar.module.css`
- Test: `client/src/components/MarkedRangeCalendar/MarkedRangeCalendar.test.tsx`

**Interfaces:**
- Consumes: `Calendar` from `client/src/components/ui/calendar.tsx` (Task 2, unchanged external contract).
- Produces: `MarkedRangeCalendar`, `DateRangeValue`, `computeNextRange`, `toIsoDate` — all unchanged signatures (consumed by `JournalCalendarFilter.tsx` in Task 5 and `routes/journal/index.tsx` in Task 6).

- [x] **Step 1: Create `MarkedRangeCalendar.module.css`**

```css
.root {
  width: fit-content;
}
.months {
  display: flex;
  gap: 1.5rem;
}
.month {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}
.monthCaption {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0.25rem 0.5rem;
  font-family: 'IBM Plex Mono', ui-monospace, monospace;
  font-size: 0.75rem;
  text-transform: uppercase;
  color: #5b564c;
}
.monthGrid {
  width: 100%;
  border-collapse: collapse;
}
.weekdays {
  display: flex;
}
.weekday {
  flex: 1;
  text-align: center;
  font-family: 'IBM Plex Mono', ui-monospace, monospace;
  font-size: 0.65rem;
  text-transform: uppercase;
  color: #5b564c;
}
.week {
  display: flex;
  width: 100%;
}
.day {
  aspect-ratio: 1;
  width: 2.25rem;
  padding: 0.125rem;
  text-align: center;
}
```

- [x] **Step 2: Rewrite `MarkedRangeCalendar.tsx`**

```typescript
import { createContext, useContext, useEffect, useMemo, useRef } from 'react';
import type { ComponentProps } from 'react';
import type { DayButton } from 'react-day-picker';
import { chakra } from '@chakra-ui/react';
import { Calendar } from '../ui/calendar.tsx';
import styles from './MarkedRangeCalendar.module.css';

export interface DateRangeValue {
  from?: Date;
  to?: Date;
}

export interface MarkedRangeCalendarProps {
  markedDates: Map<string, string>;
  visibleMonth: Date;
  onVisibleMonthChange: (month: Date) => void;
  selectedRange: DateRangeValue;
  onRangeChange: (range: DateRangeValue) => void;
}

export const toIsoDate = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const isSameDay = (a: Date, b: Date): boolean => toIsoDate(a) === toIsoDate(b);

export const computeNextRange = (current: DateRangeValue, clicked: Date): DateRangeValue => {
  if (!current.from) {
    return { from: clicked, to: clicked };
  }
  const isSingleDaySelection = !current.to || isSameDay(current.from, current.to);
  if (!isSingleDaySelection) {
    return { from: clicked, to: clicked };
  }
  if (clicked.getTime() < current.from.getTime()) {
    return { from: clicked, to: clicked };
  }
  return { from: current.from, to: clicked };
};

const isInRange = (date: Date, range: DateRangeValue): boolean => {
  if (!range.from || !range.to) return false;
  return date.getTime() >= range.from.getTime() && date.getTime() <= range.to.getTime();
};

const isEndpoint = (date: Date, range: DateRangeValue): boolean =>
  Boolean((range.from && isSameDay(date, range.from)) || (range.to && isSameDay(date, range.to)));

interface MarkedRangeContextValue {
  markedDates: Map<string, string>;
  selectedRange: DateRangeValue;
  onRangeChange: (range: DateRangeValue) => void;
}

const defaultContextValue: MarkedRangeContextValue = {
  markedDates: new Map(),
  selectedRange: {},
  onRangeChange: () => {},
};

const MarkedRangeContext = createContext<MarkedRangeContextValue>(defaultContextValue);

const DayCellButton = chakra('button');

function MarkedDayButton({
  className: _className,
  day,
  modifiers,
  children,
  ...props
}: ComponentProps<typeof DayButton>) {
  const { markedDates, selectedRange, onRangeChange } = useContext(MarkedRangeContext);
  const ref = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (modifiers.focused) ref.current?.focus();
  }, [modifiers.focused]);

  const iso = toIsoDate(day.date);
  const ringColor = markedDates.get(iso);
  const { disabled } = modifiers;
  const inRange = !disabled && isInRange(day.date, selectedRange);
  const endpoint = !disabled && isEndpoint(day.date, selectedRange);

  return (
    <DayCellButton
      {...props}
      ref={ref}
      type="button"
      data-iso={iso}
      disabled={disabled}
      onClick={() => {
        if (disabled) return;
        onRangeChange(computeNextRange(selectedRange, day.date));
      }}
      display="flex"
      aspectRatio="1"
      boxSize="full"
      alignItems="center"
      justifyContent="center"
      fontFamily="mono"
      fontSize="xs"
      cursor={disabled ? 'default' : 'pointer'}
      color={endpoint ? 'paper' : disabled ? 'inkSoft' : 'ink'}
      opacity={disabled ? 0.3 : 1}
      bg={endpoint ? 'moss' : inRange ? 'moss/14' : undefined}
      style={ringColor && !endpoint ? { boxShadow: `inset 0 0 0 1.3px ${ringColor}` } : undefined}
    >
      {children ?? day.date.getDate()}
    </DayCellButton>
  );
}

export function MarkedRangeCalendar({
  markedDates,
  visibleMonth,
  onVisibleMonthChange,
  selectedRange,
  onRangeChange,
}: MarkedRangeCalendarProps) {
  const isDisabled = (date: Date): boolean => !markedDates.has(toIsoDate(date));

  const contextValue = useMemo<MarkedRangeContextValue>(
    () => ({ markedDates, selectedRange, onRangeChange }),
    [markedDates, selectedRange, onRangeChange],
  );

  return (
    <MarkedRangeContext.Provider value={contextValue}>
      <Calendar
        numberOfMonths={2}
        month={visibleMonth}
        onMonthChange={onVisibleMonthChange}
        disabled={isDisabled}
        showOutsideDays={false}
        onDayClick={() => {}}
        formatters={{
          formatWeekdayName: (date: Date) =>
            date.toLocaleDateString('en-US', { weekday: 'narrow' }),
        }}
        classNames={{
          root: styles.root,
          months: styles.months,
          month: styles.month,
          nav: 'hidden',
          month_caption: styles.monthCaption,
          month_grid: styles.monthGrid,
          weekdays: styles.weekdays,
          weekday: styles.weekday,
          week: styles.week,
          day: styles.day,
        }}
        components={{ DayButton: MarkedDayButton }}
      />
    </MarkedRangeContext.Provider>
  );
}
```

Note: `nav: 'hidden'` stays a bare string — it's a static, permanent hide (not a design token), not a candidate for the CSS module.

- [x] **Step 3: Run the regression test**

```bash
cd client
npx vitest run src/components/MarkedRangeCalendar/MarkedRangeCalendar.test.tsx
npm run lint
npx tsc -b
```

Expected: PASS, including the `data-iso` queries and `th[scope="col"]` weekday-header queries — both come from `react-day-picker`'s own DOM structure, unaffected by the styling swap.

- [x] **Step 4: Commit**

```bash
git add client/src/components/MarkedRangeCalendar/MarkedRangeCalendar.tsx client/src/components/MarkedRangeCalendar/MarkedRangeCalendar.module.css
git commit -m "feat(client): reskin MarkedRangeCalendar with Chakra"
```

---

## Task 5: Journal components — `MoodPicker`, `EntryForm`, `JournalCalendarFilter`, `EntryView`, `RichTextEditor`, `moodColors.ts`

**Files:**
- Modify: `client/src/modules/journal/moodColors.ts` (rename `MOOD_DOT_CLASS` → `MOOD_DOT_COLOR`, values become Chakra color-token names instead of Tailwind classes)
- Modify: `client/src/modules/journal/components/MoodPicker/MoodPicker.tsx` (rewrite)
- Modify: `client/src/modules/journal/components/EntryForm/EntryForm.tsx` (rewrite)
- Modify: `client/src/modules/journal/components/JournalCalendarFilter/JournalCalendarFilter.tsx` (rewrite)
- Modify: `client/src/modules/journal/components/EntryView/EntryView.tsx` (rewrite)
- Modify: `client/src/modules/journal/components/RichTextEditor/RichTextEditor.tsx` (rewrite)
- Test: `MoodPicker.test.tsx`, `EntryForm.test.tsx`, `JournalCalendarFilter.test.tsx`, `EntryView.test.tsx`

**Interfaces:**
- Consumes: `Button` (Task 2), `Calendar` (Task 2), `Popover`/`PopoverTrigger`/`PopoverContent` (Task 3), `Select`/`SelectTrigger`/`SelectValue`/`SelectContent`/`SelectItem`/`createListCollection` (Task 3), `MarkedRangeCalendar`/`DateRangeValue` (Task 4).
- Produces: `MOOD_DOT_COLOR: Record<PrimaryMood, string>` from `moodColors.ts` (replaces `MOOD_DOT_CLASS`) — consumed here and by `routes/journal/index.tsx` in Task 6. `MOOD_LABEL` and `MOOD_RING_COLOR` are unchanged.
- All component props (`EntryFormProps`, `MoodPickerProps`, `JournalCalendarFilterProps`, `EntryViewProps`, `RichTextEditorProps`) are unchanged — this task only touches internals/markup.

- [x] **Step 1: Rename the mood-dot color map**

Edit `client/src/modules/journal/moodColors.ts`:

```typescript
import type { PrimaryMood } from '@nee3/shared-types';

export const MOOD_DOT_COLOR: Record<PrimaryMood, string> = {
  happy: 'rust',
  calm: 'moss',
  sad: 'inkBlue',
  anxious: 'moodAnxious',
  angry: 'moodAngry',
};

export const MOOD_LABEL: Record<PrimaryMood, string> = {
  happy: 'Happy',
  calm: 'Calm',
  sad: 'Sad',
  anxious: 'Anxious',
  angry: 'Angry',
};

export const MOOD_RING_COLOR: Record<PrimaryMood, string> = {
  happy: '#A8532F',
  calm: '#55684A',
  sad: '#2C3E52',
  anxious: '#B98A2E',
  angry: '#7A2E1E',
};
```

- [x] **Step 2: Rewrite `MoodPicker.tsx`**

```typescript
import { useEffect, useRef, useState } from 'react';
import { Box, Flex, Input, Text } from '@chakra-ui/react';
import { MOOD_TAXONOMY } from '@nee3/shared-types';
import type { PrimaryMood, SpecificEmotion } from '@nee3/shared-types';
import { MOOD_DOT_COLOR, MOOD_LABEL } from '../../moodColors.ts';

export interface MoodPickerProps {
  primaryMood: PrimaryMood | null;
  specificEmotion: SpecificEmotion | null;
  onChange: (value: { primaryMood: PrimaryMood; specificEmotion: SpecificEmotion | null }) => void;
}

const PRIMARY_MOODS = Object.keys(MOOD_TAXONOMY) as PrimaryMood[];

interface LocalMoodState {
  selectedFixed: string | null;
  customText: string;
}

function deriveLocalState(
  primaryMood: PrimaryMood | null,
  specificEmotion: SpecificEmotion | null,
): LocalMoodState {
  const isFixed =
    primaryMood !== null && MOOD_TAXONOMY[primaryMood].includes(specificEmotion ?? '');
  return {
    selectedFixed: isFixed ? specificEmotion : null,
    customText: !isFixed && specificEmotion ? specificEmotion : '',
  };
}

export function MoodPicker({ primaryMood, specificEmotion, onChange }: MoodPickerProps) {
  const [{ selectedFixed, customText }, setLocalState] = useState<LocalMoodState>(() =>
    deriveLocalState(primaryMood, specificEmotion),
  );

  const lastEmitted = useRef<{
    primaryMood: PrimaryMood | null;
    specificEmotion: SpecificEmotion | null;
  }>({
    primaryMood,
    specificEmotion,
  });

  useEffect(() => {
    const last = lastEmitted.current;
    const isExternalChange =
      last.primaryMood !== primaryMood || last.specificEmotion !== specificEmotion;
    if (!isExternalChange) return;
    lastEmitted.current = { primaryMood, specificEmotion };
    setLocalState(deriveLocalState(primaryMood, specificEmotion));
  }, [primaryMood, specificEmotion]);

  const emit = (nextPrimaryMood: PrimaryMood, nextSpecificEmotion: SpecificEmotion | null) => {
    lastEmitted.current = { primaryMood: nextPrimaryMood, specificEmotion: nextSpecificEmotion };
    onChange({ primaryMood: nextPrimaryMood, specificEmotion: nextSpecificEmotion });
  };

  const handlePrimaryMoodClick = (mood: PrimaryMood) => {
    setLocalState({ selectedFixed: null, customText: '' });
    emit(mood, null);
  };

  const handleFixedEmotionClick = (emotion: string) => {
    if (!primaryMood) return;
    setLocalState({ selectedFixed: emotion, customText: '' });
    emit(primaryMood, emotion);
  };

  const handleCustomChange = (raw: string) => {
    if (!primaryMood) return;
    setLocalState({ selectedFixed: null, customText: raw });
    const trimmed = raw.trim();
    emit(primaryMood, trimmed.length > 0 ? raw : null);
  };

  return (
    <Box as="fieldset" display="flex" flexDirection="column" gap="2">
      <Text
        as="legend"
        fontFamily="mono"
        fontSize="xs"
        textTransform="uppercase"
        letterSpacing="wide"
        color="inkSoft"
      >
        Mood
      </Text>
      <Flex wrap="wrap" gap="2" role="radiogroup" aria-label="Primary mood">
        {PRIMARY_MOODS.map((mood) => (
          <Box
            key={mood}
            as="button"
            type="button"
            role="radio"
            aria-checked={primaryMood === mood}
            onClick={() => handlePrimaryMoodClick(mood)}
            display="flex"
            alignItems="center"
            gap="1.5"
            borderWidth="1px"
            borderColor={primaryMood === mood ? 'inkBlue' : 'line'}
            px="2"
            py="1"
            fontFamily="mono"
            fontSize="xs"
            textTransform="uppercase"
          >
            <Box boxSize="2.5" borderRadius="full" bg={MOOD_DOT_COLOR[mood]} aria-hidden="true" />
            {MOOD_LABEL[mood]}
          </Box>
        ))}
      </Flex>
      {primaryMood && (
        <Flex wrap="wrap" align="center" gap="2" role="radiogroup" aria-label="Specific emotion">
          {MOOD_TAXONOMY[primaryMood].map((emotion) => (
            <Box
              key={emotion}
              as="button"
              type="button"
              role="radio"
              aria-checked={selectedFixed === emotion}
              onClick={() => handleFixedEmotionClick(emotion)}
              borderWidth="1px"
              borderColor={selectedFixed === emotion ? 'moss' : 'line'}
              color={selectedFixed === emotion ? 'moss' : undefined}
              px="2"
              py="1"
              fontFamily="mono"
              fontSize="xs"
              textTransform="uppercase"
            >
              {emotion}
            </Box>
          ))}
          <Input
            type="text"
            placeholder="Custom"
            value={customText}
            onChange={(e) => handleCustomChange(e.target.value)}
            borderWidth="1px"
            borderColor="line"
            bg="paperCard"
            px="2"
            py="1"
            fontFamily="mono"
            fontSize="xs"
            w="auto"
          />
        </Flex>
      )}
    </Box>
  );
}
```

- [x] **Step 3: Rewrite `EntryForm.tsx`**

```typescript
import { FormEvent, useEffect, useRef, useState } from 'react';
import { format, parse } from 'date-fns';
import { Flex, Input, Text } from '@chakra-ui/react';
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

  const collisionLookupDate = initialEntry ? null : date;
  const { data: collidingEntry, isLoading: collisionLookupLoading } =
    useEntryByDate(collisionLookupDate);
  const prefilledFromCollisionId = useRef<number | null>(null);

  useEffect(() => {
    if (collisionLookupLoading) {
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
    <Flex as="form" onSubmit={handleSubmit} direction="column" gap="4" maxW="2xl">
      {existingEntryId && !initialEntry && (
        <Text fontFamily="mono" fontSize="xs" textTransform="uppercase" color="rust">
          An entry already exists for this date &mdash; editing it instead.
        </Text>
      )}
      <Flex
        as="label"
        direction="column"
        gap="1"
        fontFamily="mono"
        fontSize="xs"
        textTransform="uppercase"
        htmlFor="entry-date"
      >
        Date
        <Popover open={datePopoverOpen} onOpenChange={(details) => setDatePopoverOpen(details.open)}>
          <PopoverTrigger asChild>
            <Button
              id="entry-date"
              type="button"
              variant="outline"
              justifyContent="flex-start"
              fontFamily="body"
              textTransform="none"
              w="fit-content"
              disabled={Boolean(initialEntry)}
            >
              {format(parseIsoDate(date), 'MMM d, yyyy')}
            </Button>
          </PopoverTrigger>
          <PopoverContent w="auto" borderColor="line" bg="paperCard" p="2">
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
      </Flex>
      <Flex
        as="label"
        direction="column"
        gap="1"
        fontFamily="mono"
        fontSize="xs"
        textTransform="uppercase"
        htmlFor="entry-title"
      >
        Title
        <Input
          id="entry-title"
          borderWidth="1px"
          borderColor="line"
          bg="paperCard"
          p="2"
          fontFamily="body"
          textTransform="none"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
        />
      </Flex>
      <MoodPicker
        primaryMood={primaryMood}
        specificEmotion={specificEmotion}
        onChange={({ primaryMood: p, specificEmotion: s }) => {
          setPrimaryMood(p);
          setSpecificEmotion(s);
        }}
      />
      <RichTextEditor value={content} onChange={setContent} placeholder="Write today's entry..." />
      {error && <Text color="rust">{error}</Text>}
      <Button type="submit">Save entry</Button>
    </Flex>
  );
}
```

Note the `onOpenChange` signature change: Chakra's `Popover.Root` calls `onOpenChange` with `{ open: boolean }` rather than Radix's bare `boolean` — the callback above is adjusted accordingly.

- [x] **Step 4: Rewrite `JournalCalendarFilter.tsx`**

```typescript
import { useMemo, useState } from 'react';
import { Box, Flex, Text } from '@chakra-ui/react';
import { Button } from '../../../../components/ui/button.tsx';
import {
  createListCollection,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../../../components/ui/select.tsx';
import {
  MarkedRangeCalendar,
  type DateRangeValue,
} from '../../../../components/MarkedRangeCalendar/MarkedRangeCalendar.tsx';
import { useEntriesByRange } from '../../api/journalHooks.ts';
import { MOOD_RING_COLOR } from '../../moodColors.ts';

export interface JournalCalendarFilterProps {
  selectedRange: DateRangeValue;
  onRangeChange: (range: DateRangeValue) => void;
  entryCount?: number;
}

const MONTH_LABELS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const MONTH_ABBR = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

const toIsoDate = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const formatShortDate = (date: Date): string => `${MONTH_ABBR[date.getMonth()]} ${date.getDate()}`;

const startOfMonth = (date: Date): Date => new Date(date.getFullYear(), date.getMonth(), 1);
const addMonths = (date: Date, count: number): Date =>
  new Date(date.getFullYear(), date.getMonth() + count, 1);
const endOfMonth = (date: Date): Date => new Date(date.getFullYear(), date.getMonth() + 1, 0);

export function formatRangeLabel(range: DateRangeValue): string {
  if (!range.from) return '';
  const { from, to } = range;
  if (!to || toIsoDate(from) === toIsoDate(to)) {
    return `Showing entries ${formatShortDate(from)}, ${from.getFullYear()}`;
  }
  return `Showing entries ${formatShortDate(from)} – ${formatShortDate(to)}, ${to.getFullYear()}`;
}

export function JournalCalendarFilter({
  selectedRange,
  onRangeChange,
  entryCount,
}: JournalCalendarFilterProps) {
  const [visibleMonth, setVisibleMonth] = useState<Date>(() => startOfMonth(new Date()));

  const rangeStart = toIsoDate(startOfMonth(visibleMonth));
  const rangeEnd = toIsoDate(endOfMonth(addMonths(visibleMonth, 1)));
  const { data } = useEntriesByRange({ start: rangeStart, end: rangeEnd });

  const markedDates = useMemo(() => {
    const map = new Map<string, string>();
    (data ?? []).forEach((entry) => {
      map.set(entry.date, MOOD_RING_COLOR[entry.primaryMood]);
    });
    return map;
  }, [data]);

  const years = useMemo(() => {
    const current = new Date().getFullYear();
    return Array.from({ length: 11 }, (_, i) => current - 5 + i);
  }, []);

  const monthCollection = useMemo(
    () =>
      createListCollection({
        items: MONTH_LABELS.map((label, index) => ({ value: String(index), label })),
      }),
    [],
  );
  const yearCollection = useMemo(
    () =>
      createListCollection({
        items: years.map((year) => ({ value: String(year), label: String(year) })),
      }),
    [years],
  );

  const hasFilter = Boolean(selectedRange.from);

  return (
    <Box borderWidth="1px" borderColor="line" bg="paperCard" p="4">
      <Flex mb="3" align="center" justify="space-between" gap="2">
        <Flex align="center" gap="2">
          <Button
            type="button"
            variant="outline"
            size="icon-sm"
            aria-label="Previous month"
            onClick={() => setVisibleMonth(addMonths(visibleMonth, -1))}
          >
            &lsaquo;
          </Button>
          <Select
            collection={monthCollection}
            value={[String(visibleMonth.getMonth())]}
            onValueChange={(details) =>
              setVisibleMonth(new Date(visibleMonth.getFullYear(), Number(details.value[0]), 1))
            }
          >
            <SelectTrigger borderRadius="0">
              <SelectValue />
            </SelectTrigger>
            <SelectContent borderRadius="0" boxShadow="none">
              {monthCollection.items.map((item) => (
                <SelectItem key={item.value} item={item}>
                  {item.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            collection={yearCollection}
            value={[String(visibleMonth.getFullYear())]}
            onValueChange={(details) =>
              setVisibleMonth(new Date(Number(details.value[0]), visibleMonth.getMonth(), 1))
            }
          >
            <SelectTrigger borderRadius="0">
              <SelectValue />
            </SelectTrigger>
            <SelectContent borderRadius="0" boxShadow="none">
              {yearCollection.items.map((item) => (
                <SelectItem key={item.value} item={item}>
                  {item.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            type="button"
            variant="outline"
            size="icon-sm"
            aria-label="Next month"
            onClick={() => setVisibleMonth(addMonths(visibleMonth, 1))}
          >
            &rsaquo;
          </Button>
        </Flex>
        {hasFilter && (
          <Button type="button" variant="link" onClick={() => onRangeChange({})}>
            Clear filter
          </Button>
        )}
      </Flex>
      <MarkedRangeCalendar
        markedDates={markedDates}
        visibleMonth={visibleMonth}
        onVisibleMonthChange={setVisibleMonth}
        selectedRange={selectedRange}
        onRangeChange={onRangeChange}
      />
      {hasFilter && (
        <Text mt="3" fontFamily="mono" fontSize="xs" textTransform="uppercase" color="inkSoft">
          {formatRangeLabel(selectedRange)}
          {entryCount !== undefined ? ` · ${entryCount} entries` : ''}
        </Text>
      )}
    </Box>
  );
}
```

- [x] **Step 5: Rewrite `EntryView.tsx`**

```typescript
import { Box, Flex, Heading, Text } from '@chakra-ui/react';
import type { Entry } from '@nee3/shared-types';
import { MOOD_DOT_COLOR, MOOD_LABEL } from '../../moodColors.ts';

export interface EntryViewProps {
  entry: Entry;
}

export function EntryView({ entry }: EntryViewProps) {
  return (
    <Box as="article" mx="auto" maxW="2xl" borderLeftWidth="2px" borderLeftStyle="dashed" borderColor="line" pl="6">
      <Text fontFamily="mono" fontSize="xs" textTransform="uppercase" letterSpacing="wide" color="inkSoft">
        {entry.date}
      </Text>
      <Heading as="h1" fontFamily="heading" fontSize="3xl" fontWeight="semibold" color="ink">
        {entry.title}
      </Heading>
      <Flex
        mt="1"
        align="center"
        gap="1.5"
        fontFamily="mono"
        fontSize="xs"
        textTransform="uppercase"
        color="inkSoft"
      >
        <Box boxSize="2.5" borderRadius="full" bg={MOOD_DOT_COLOR[entry.primaryMood]} aria-hidden="true" />
        {MOOD_LABEL[entry.primaryMood]}
        {entry.specificEmotion && <> &middot; {entry.specificEmotion}</>}
      </Flex>
      <Box
        className="entry-content"
        mt="6"
        fontFamily="body"
        fontSize="17px"
        color="ink"
        // The content injected via dangerouslySetInnerHTML is safe here specifically because
        // entry.content was sanitized server-side (allow-listed tags only, per
        // backend/src/modules/journal/sanitize.ts) before it was ever written to the database.
        dangerouslySetInnerHTML={{ __html: entry.content }}
      />
    </Box>
  );
}
```

- [x] **Step 6: Rewrite `RichTextEditor.tsx`**

```typescript
import { useEffect } from 'react';
import { Box } from '@chakra-ui/react';
import { EditorContent, useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';

export interface RichTextEditorProps {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
}

export function RichTextEditor({ value, onChange, placeholder }: RichTextEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        strike: false,
        code: false,
        codeBlock: false,
        blockquote: false,
        horizontalRule: false,
      }),
    ],
    content: value,
    onUpdate: ({ editor: activeEditor }) => onChange(activeEditor.getHTML()),
  });

  useEffect(() => {
    if (editor && value !== editor.getHTML()) {
      editor.commands.setContent(value, { emitUpdate: false });
    }
  }, [value, editor]);

  return (
    <Box borderWidth="1px" borderColor="line" bg="paperCard" p="3" fontFamily="body" color="ink">
      <EditorContent editor={editor} className="entry-content" style={{ minHeight: '10rem' }} data-placeholder={placeholder} />
    </Box>
  );
}
```

- [x] **Step 7: Run the regression tests**

```bash
cd client
npx vitest run src/modules/journal/components/MoodPicker/MoodPicker.test.tsx src/modules/journal/components/EntryForm/EntryForm.test.tsx src/modules/journal/components/JournalCalendarFilter/JournalCalendarFilter.test.tsx src/modules/journal/components/EntryView/EntryView.test.tsx
npm run lint
npx tsc -b
```

Expected: PASS. If `JournalCalendarFilter.test.tsx` fails on the `[data-iso="..."]`/`getByText('Clear filter')` queries, check whether the Select's popup content is portalled outside the `container` the test scopes its queries to — if so, switch the affected assertions to `screen.getByText(...)` (already the case for those two) rather than `container.querySelector`, which is scoped by design in the `data-iso` case (that query is against `MarkedRangeCalendar`'s DOM, not the Select).

- [x] **Step 8: Commit**

```bash
git add client/src/modules/journal/moodColors.ts client/src/modules/journal/components/MoodPicker/MoodPicker.tsx client/src/modules/journal/components/EntryForm/EntryForm.tsx client/src/modules/journal/components/JournalCalendarFilter/JournalCalendarFilter.tsx client/src/modules/journal/components/EntryView/EntryView.tsx client/src/modules/journal/components/RichTextEditor/RichTextEditor.tsx
git commit -m "feat(client): migrate journal module components to Chakra"
```

---

## Task 6: Routes — `index`, `login`, `register`, `journal/index`, `journal/new`, `journal/$entryId`, `journal/$entryId.edit`

**Files:**
- Modify: `client/src/routes/index.tsx`
- Modify: `client/src/routes/login.tsx`
- Modify: `client/src/routes/register.tsx`
- Modify: `client/src/routes/journal/index.tsx`
- Modify: `client/src/routes/journal/new.tsx`
- Modify: `client/src/routes/journal/$entryId.tsx`
- Modify: `client/src/routes/journal/$entryId.edit.tsx`

**Interfaces:**
- Consumes: `Button` (Task 2, now supports `asChild`), `EntryForm`/`EntryView`/`JournalCalendarFilter` (Task 5), `MOOD_DOT_COLOR`/`MOOD_LABEL` (Task 5), `MarkedRangeCalendar`'s `DateRangeValue` (Task 4). `buttonVariants` and `cn` are **no longer imported** anywhere in this task — `$entryId.tsx`'s "Edit" link switches from `cn(buttonVariants({variant:'outline'}))` on a bare `Link` to `<Button asChild variant="outline"><Link .../></Button>`.
- `login.tsx`/`register.tsx` keep their pre-existing Tailwind-default palette (`gray-300`/`black`/`red-600`, not the app's `ink`/`moss`/`rust` design tokens) — this is intentional: the spec is a like-for-like styling swap, not a redesign, and those two routes were never styled to `design-system.md` in the first place. Map them to Chakra's built-in `gray`/`red`/`black` tokens (shipped by `defaultConfig`), not to custom design tokens.

- [x] **Step 1: Rewrite `routes/index.tsx`**

```typescript
import { createFileRoute } from '@tanstack/react-router';
import { Box } from '@chakra-ui/react';

export const Route = createFileRoute('/')({
  component: () => <Box p="4">Nee.3</Box>,
});
```

- [x] **Step 2: Rewrite `routes/login.tsx`**

```typescript
import { createFileRoute, getRouteApi, useNavigate, Link } from '@tanstack/react-router';
import { FormEvent, useState } from 'react';
import { Box, Flex, Heading, Input, Text } from '@chakra-ui/react';
import { useAuth } from '../shell/AuthProvider.tsx';

export interface LoginSearch {
  redirect?: string;
}

const routeApi = getRouteApi('/login');

function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const search = routeApi.useSearch();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    try {
      await login({ username, password });
      navigate({ to: search.redirect ?? '/' });
    } catch {
      setError('Invalid username or password.');
    }
  };

  return (
    <Box mx="auto" maxW="sm" p="4">
      <Heading as="h1" mb="4" fontSize="xl" fontWeight="semibold">
        Log in
      </Heading>
      <Flex as="form" onSubmit={handleSubmit} direction="column" gap="3">
        <Flex as="label" direction="column" gap="1" htmlFor="login-username">
          Username
          <Input
            id="login-username"
            borderColor="gray.300"
            p="2"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
          />
        </Flex>
        <Flex as="label" direction="column" gap="1" htmlFor="login-password">
          Password
          <Input
            id="login-password"
            type="password"
            borderColor="gray.300"
            p="2"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </Flex>
        {error && <Text color="red.600">{error}</Text>}
        <Box as="button" type="submit" bg="black" p="2" color="white">
          Log in
        </Box>
      </Flex>
      <Text mt="3" fontSize="sm" color="inkSoft">
        Don&apos;t have an account? <Link to="/register">Register</Link>
      </Text>
    </Box>
  );
}

export const Route = createFileRoute('/login')({
  component: LoginPage,
  validateSearch: (search: Record<string, unknown>): LoginSearch => ({
    redirect: typeof search.redirect === 'string' ? search.redirect : undefined,
  }),
});
```

- [x] **Step 3: Rewrite `routes/register.tsx`**

```typescript
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { FormEvent, useState } from 'react';
import { Box, Flex, Heading, Input, Text } from '@chakra-ui/react';
import { useAuth } from '../shell/AuthProvider.tsx';

function RegisterPage() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    try {
      await register({ username, email, password });
      navigate({ to: '/' });
    } catch {
      setError('Could not create account. Username or email may already be taken.');
    }
  };

  return (
    <Box mx="auto" maxW="sm" p="4">
      <Heading as="h1" mb="4" fontSize="xl" fontWeight="semibold">
        Register
      </Heading>
      <Flex as="form" onSubmit={handleSubmit} direction="column" gap="3">
        <Flex as="label" direction="column" gap="1" htmlFor="register-username">
          Username
          <Input
            id="register-username"
            borderColor="gray.300"
            p="2"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
          />
        </Flex>
        <Flex as="label" direction="column" gap="1" htmlFor="register-email">
          Email
          <Input
            id="register-email"
            type="email"
            borderColor="gray.300"
            p="2"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </Flex>
        <Flex as="label" direction="column" gap="1" htmlFor="register-password">
          Password
          <Input
            id="register-password"
            type="password"
            borderColor="gray.300"
            p="2"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </Flex>
        <Flex as="label" direction="column" gap="1" htmlFor="register-confirm-password">
          Confirm password
          <Input
            id="register-confirm-password"
            type="password"
            borderColor="gray.300"
            p="2"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
          />
        </Flex>
        {error && <Text color="red.600">{error}</Text>}
        <Box as="button" type="submit" bg="black" p="2" color="white">
          Register
        </Box>
      </Flex>
    </Box>
  );
}

export const Route = createFileRoute('/register')({
  component: RegisterPage,
});
```

- [x] **Step 4: Rewrite `routes/journal/new.tsx`**

```typescript
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import type { CreateEntryRequest } from '@nee3/shared-types';
import { Box, Heading } from '@chakra-ui/react';
import { EntryForm } from '../../modules/journal/components/EntryForm/EntryForm.tsx';
import { useCreateEntry, useUpdateEntry } from '../../modules/journal/api/journalHooks.ts';
import { requireAuth } from '../../auth/requireAuth.ts';

function NewEntryPage() {
  const navigate = useNavigate();
  const createEntry = useCreateEntry();
  const updateEntry = useUpdateEntry();

  const handleSubmit = async (input: CreateEntryRequest, existingEntryId?: number) => {
    const entry = existingEntryId
      ? await updateEntry.mutateAsync({ id: existingEntryId, input })
      : await createEntry.mutateAsync(input);
    navigate({ to: '/journal/$entryId', params: { entryId: String(entry.id) } });
  };

  return (
    <Box mx="auto" maxW="2xl" p="4">
      <Heading as="h1" mb="4" fontFamily="heading" fontSize="3xl" fontWeight="semibold" color="ink">
        New entry
      </Heading>
      <EntryForm onSubmit={handleSubmit} />
    </Box>
  );
}

export const Route = createFileRoute('/journal/new')({
  component: NewEntryPage,
  beforeLoad: ({ context, location }) => requireAuth(context.queryClient)({ location }),
});
```

- [x] **Step 5: Rewrite `routes/journal/$entryId.edit.tsx`**

```typescript
import { createFileRoute, getRouteApi, useNavigate } from '@tanstack/react-router';
import type { CreateEntryRequest } from '@nee3/shared-types';
import { Box, Heading, Text } from '@chakra-ui/react';
import { EntryForm } from '../../modules/journal/components/EntryForm/EntryForm.tsx';
import { useEntry, useUpdateEntry } from '../../modules/journal/api/journalHooks.ts';
import { requireAuth } from '../../auth/requireAuth.ts';

const routeApi = getRouteApi('/journal/$entryId/edit');

function EditEntryPage() {
  const { entryId } = routeApi.useParams();
  const navigate = useNavigate();
  const { data: entry, isLoading } = useEntry(Number(entryId));
  const updateEntry = useUpdateEntry();

  if (isLoading || !entry) {
    return (
      <Text p="4" color="inkSoft">
        Loading...
      </Text>
    );
  }

  const handleSubmit = async (input: CreateEntryRequest) => {
    await updateEntry.mutateAsync({ id: entry.id, input });
    navigate({ to: '/journal/$entryId', params: { entryId } });
  };

  return (
    <Box mx="auto" maxW="2xl" p="4">
      <Heading as="h1" mb="4" fontFamily="heading" fontSize="3xl" fontWeight="semibold" color="ink">
        Edit entry
      </Heading>
      <EntryForm initialEntry={entry} onSubmit={handleSubmit} />
    </Box>
  );
}

export const Route = createFileRoute('/journal/$entryId/edit')({
  component: EditEntryPage,
  beforeLoad: ({ context, location }) => requireAuth(context.queryClient)({ location }),
});
```

- [x] **Step 6: Rewrite `routes/journal/$entryId.tsx`**

```typescript
import { createFileRoute, getRouteApi, Link, useNavigate } from '@tanstack/react-router';
import { useState } from 'react';
import { Box, Flex, Text } from '@chakra-ui/react';
import { useDeleteEntry, useEntry } from '../../modules/journal/api/journalHooks.ts';
import { EntryView } from '../../modules/journal/components/EntryView/EntryView.tsx';
import { requireAuth } from '../../auth/requireAuth.ts';
import { Button } from '../../components/ui/button.tsx';

const routeApi = getRouteApi('/journal/$entryId');

function EntryDetailPage() {
  const { entryId } = routeApi.useParams();
  const navigate = useNavigate();
  const { data: entry, isLoading } = useEntry(Number(entryId));
  const deleteEntry = useDeleteEntry();
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  const handleDelete = async () => {
    await deleteEntry.mutateAsync(Number(entryId));
    navigate({ to: '/journal', search: { page: 1 } });
  };

  if (isLoading || !entry) {
    return (
      <Text p="4" color="inkSoft">
        Loading...
      </Text>
    );
  }

  return (
    <Box p="4">
      <Flex mx="auto" mb="4" maxW="2xl" align="center" gap="3">
        <Button asChild variant="outline">
          <Link to="/journal/$entryId/edit" params={{ entryId }}>
            Edit
          </Link>
        </Button>
        {confirmingDelete ? (
          <Button type="button" variant="destructive" onClick={handleDelete}>
            Confirm delete
          </Button>
        ) : (
          <Button
            type="button"
            variant="outline"
            borderColor="rust"
            color="rust"
            _hover={{ bg: 'rust/5' }}
            onClick={() => setConfirmingDelete(true)}
          >
            Delete
          </Button>
        )}
      </Flex>
      <EntryView entry={entry} />
    </Box>
  );
}

export const Route = createFileRoute('/journal/$entryId')({
  component: EntryDetailPage,
  beforeLoad: ({ context, location }) => requireAuth(context.queryClient)({ location }),
});
```

- [x] **Step 7: Rewrite `routes/journal/index.tsx`**

```typescript
import { createFileRoute, getRouteApi, Link } from '@tanstack/react-router';
import { useState } from 'react';
import { Box, Flex, Heading, Text } from '@chakra-ui/react';
import { useEntries, useEntriesByRange } from '../../modules/journal/api/journalHooks.ts';
import { MOOD_DOT_COLOR, MOOD_LABEL } from '../../modules/journal/moodColors.ts';
import { stripHtml } from '../../modules/journal/textUtils.ts';
import { requireAuth } from '../../auth/requireAuth.ts';
import { JournalCalendarFilter } from '../../modules/journal/components/JournalCalendarFilter/JournalCalendarFilter.tsx';
import type { DateRangeValue } from '../../components/MarkedRangeCalendar/MarkedRangeCalendar.tsx';

export interface JournalIndexSearch {
  page: number;
}

const routeApi = getRouteApi('/journal/');

const toIsoDate = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

function JournalIndexPage() {
  const { page } = routeApi.useSearch();
  const [selectedRange, setSelectedRange] = useState<DateRangeValue>({});
  const hasFilter = Boolean(selectedRange.from);

  const paginated = useEntries(page);
  const filtered = useEntriesByRange({
    start: selectedRange.from ? toIsoDate(selectedRange.from) : '',
    end: selectedRange.to ? toIsoDate(selectedRange.to) : '',
  });

  const entries = hasFilter ? (filtered.data ?? []) : (paginated.data?.entries ?? []);
  const dataLoaded = hasFilter ? filtered.data !== undefined : paginated.data !== undefined;

  return (
    <Box mx="auto" maxW="2xl" p="4">
      <Flex mb="4" align="center" justify="space-between">
        <Heading as="h1" fontFamily="heading" fontSize="3xl" fontWeight="semibold" color="ink">
          Journal
        </Heading>
        <Box asChild bg="inkBlue" px="3" py="2" fontFamily="mono" fontSize="xs" textTransform="uppercase" color="paper">
          <Link to="/journal/new">New entry</Link>
        </Box>
      </Flex>
      <Box mb="4">
        <JournalCalendarFilter
          selectedRange={selectedRange}
          onRangeChange={setSelectedRange}
          entryCount={hasFilter ? filtered.data?.length : undefined}
        />
      </Box>
      <Box as="ul" display="flex" flexDirection="column" gap="3">
        {entries.map((entry) => (
          <Box as="li" key={entry.id} borderWidth="1px" borderColor="line" bg="paperCard" p="4">
            <Box asChild display="block">
              <Link to="/journal/$entryId" params={{ entryId: String(entry.id) }}>
                <Flex align="center" gap="2" fontFamily="mono" fontSize="xs" textTransform="uppercase" color="inkSoft">
                  <Box boxSize="2" borderRadius="full" bg={MOOD_DOT_COLOR[entry.primaryMood]} aria-hidden="true" />
                  {entry.date} &middot; {MOOD_LABEL[entry.primaryMood]}
                </Flex>
                <Heading as="h2" fontFamily="heading" fontSize="lg" fontWeight="medium" color="ink">
                  {entry.title}
                </Heading>
                <Text fontFamily="body" color="inkSoft">
                  {stripHtml(entry.content).slice(0, 140)}
                </Text>
              </Link>
            </Box>
          </Box>
        ))}
      </Box>
      {dataLoaded && entries.length === 0 && <Text color="inkSoft">No entries yet.</Text>}
    </Box>
  );
}

export const Route = createFileRoute('/journal/')({
  component: JournalIndexPage,
  validateSearch: (search: Record<string, unknown>): JournalIndexSearch => ({
    page: typeof search.page === 'number' ? search.page : Number(search.page) || 1,
  }),
  beforeLoad: ({ context, location }) => requireAuth(context.queryClient)({ location }),
});
```

- [x] **Step 8: Run lint, typecheck, and the full test suite**

```bash
cd client
npm run lint
npx tsc -b
npm test
```

Expected: PASS.

- [x] **Step 9: Commit**

```bash
git add client/src/routes
git commit -m "feat(client): migrate route components to Chakra"
```

---

## Task 7: `shell/Nav.tsx`, `shell/Layout.tsx`

**Files:**
- Modify: `client/src/shell/Nav.tsx`
- Modify: `client/src/shell/Layout.tsx`

**Interfaces:**
- Consumes: `Button` (Task 2, `variant="link"` + style-prop overrides in place of the old `className="h-auto p-0 text-ink-blue no-underline hover:underline"` string).

- [x] **Step 1: Rewrite `Nav.tsx`**

```typescript
import { Link, useNavigate } from '@tanstack/react-router';
import { Box, Flex, Text } from '@chakra-ui/react';
import { useAuth } from './AuthProvider.tsx';
import { Button } from '../components/ui/button.tsx';

export function Nav() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await logout();
    } finally {
      navigate({ to: '/' });
    }
  };

  return (
    <Flex as="nav" align="center" gap="4" borderBottomWidth="1px" borderColor="line" p="4">
      <Box asChild fontFamily="heading" fontWeight="medium" color="ink">
        <Link to="/">Nee.3</Link>
      </Box>
      <Flex ml="auto" align="center" gap="4" fontFamily="mono" fontSize="xs" textTransform="uppercase">
        {user ? (
          <>
            <Box asChild color="inkBlue">
              <Link to="/journal" search={{ page: 1 }}>
                Journal
              </Link>
            </Box>
            <Text color="inkSoft">{user.username}</Text>
            <Button
              type="button"
              variant="link"
              h="auto"
              p="0"
              color="inkBlue"
              textDecoration="none"
              _hover={{ textDecoration: 'underline' }}
              onClick={handleLogout}
            >
              Log out
            </Button>
          </>
        ) : (
          <>
            <Box asChild color="inkBlue">
              <Link to="/login">Log in</Link>
            </Box>
            <Box asChild color="inkBlue">
              <Link to="/register">Register</Link>
            </Box>
          </>
        )}
      </Flex>
    </Flex>
  );
}
```

- [x] **Step 2: Rewrite `Layout.tsx`**

```typescript
import { PropsWithChildren } from 'react';
import { Box } from '@chakra-ui/react';
import { Nav } from './Nav.tsx';

export function Layout({ children }: PropsWithChildren) {
  return (
    <Box minH="100vh" bg="paper" color="ink">
      <Nav />
      <Box as="main" p="4">
        {children}
      </Box>
    </Box>
  );
}
```

- [x] **Step 3: Verify build**

```bash
cd client
npm run lint
npx tsc -b
npm test
```

Expected: PASS. After this task, `grep -rl "className=" client/src` should return empty except for the `className="entry-content"` interop hooks in `EntryView.tsx`/`RichTextEditor.tsx` (Task 5) — those are intentional (global CSS class for injected/editor HTML, not a Tailwind utility) and are not part of the cutover gate.

- [x] **Step 4: Confirm the cutover gate**

```bash
grep -rn "className=" client/src | grep -v 'className="entry-content"'
```

Expected: empty output. If anything remains, it was missed in an earlier task — go back and convert it before starting Task 8.

- [x] **Step 5: Commit**

```bash
git add client/src/shell/Nav.tsx client/src/shell/Layout.tsx
git commit -m "feat(client): migrate shell Nav and Layout to Chakra"
```

---

## Task 8: Cutover — remove Tailwind, `cva`, `clsx`, `tailwind-merge`, `lib/utils.ts`

**Files:**
- Modify: `client/vite.config.ts` (remove `@tailwindcss/vite` plugin)
- Modify: `client/package.json` (remove `tailwindcss`, `@tailwindcss/vite`, `class-variance-authority`, `clsx`, `tailwind-merge`)
- Delete: `client/src/styles.css`
- Delete: `client/src/lib/utils.ts`
- Modify: `client/src/main.tsx` (drop the `./styles.css` import)

**Interfaces:**
- Consumes: nothing new. This task only removes now-dead code/dependencies once the Task 7 cutover-gate grep confirmed no file still needs them.

- [x] **Step 1: Confirm nothing still imports `cn` or `lib/utils`**

```bash
cd client
grep -rn "lib/utils\|from '@/lib/utils'\|cva\|clsx\|tailwind-merge" src
```

Expected: empty output (the last two `cn`/`cva` consumers, `components/ui/select.tsx` and `components/ui/popover.tsx`, were removed in Task 3; `button.tsx`/`calendar.tsx` in Task 2).

- [x] **Step 2: Remove the Tailwind Vite plugin**

Edit `client/vite.config.ts`:

```typescript
/// <reference types="vitest/config" />
import path from 'node:path';
import { defineConfig } from 'vite';
import viteReact from '@vitejs/plugin-react';
import { TanStackRouterVite } from '@tanstack/router-plugin/vite';

export default defineConfig(({ command }) => ({
  plugins: [
    TanStackRouterVite(),
    viteReact({
      babel: {
        plugins: command === 'serve' ? ['@locator/babel-jsx/dist/index.js'] : [],
      },
    }),
  ],
  resolve: {
    preserveSymlinks: true,
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
    },
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    globals: false,
  },
}));
```

- [x] **Step 3: Delete `styles.css` and `lib/utils.ts`, drop the import**

```bash
cd client
rm src/styles.css src/lib/utils.ts
```

Edit `client/src/main.tsx` — remove the `import './styles.css';` line (everything it provided now lives in `theme.ts`'s `globalCss`).

- [x] **Step 4: Remove the Tailwind/cva/clsx/tailwind-merge dependencies**

```bash
cd client
npm uninstall tailwindcss @tailwindcss/vite class-variance-authority clsx tailwind-merge
```

- [x] **Step 5: Full verification suite**

```bash
cd client
npm run lint
npx tsc -b
npm test
npm run build
```

Expected: all PASS.

- [x] **Step 6: Manual click-through**

Run `npm run dev` and visually check every route (`/`, `/login`, `/register`, `/journal`, `/journal/new`, `/journal/$entryId`, `/journal/$entryId/edit`) against `docs/design/demo.html`/`docs/design/design-system.md`. Check specifically:
- Button variants (default/destructive/outline/ghost/link) render with the mono-uppercase label, 4px radius, no shadow.
- The date popover and month/year selects in `JournalCalendarFilter` open, position correctly, and close on selection.
- `MarkedRangeCalendar`'s mood-ring day cells (colored box-shadow ring, range highlight, endpoint fill) still render.
- The journal entry's rich-text content (`.entry-content`) still gets its heading/list spacing.

Fix any visual regression found before proceeding — this is the last checkpoint the spec allows for cosmetic drift (Testing strategy: "Phase 3 ends with... a manual click-through of every route... fixing any visual regression before considering the migration complete").

- [x] **Step 7: Commit**

```bash
git add client/vite.config.ts client/package.json client/package-lock.json client/src/main.tsx
git add -u client/src/styles.css client/src/lib/utils.ts
git commit -m "feat(client): remove Tailwind, cva, clsx, and tailwind-merge — Chakra UI cutover complete"
```
