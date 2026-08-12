import { afterEach, vi } from 'vitest';
import { cleanup, type RenderOptions } from '@testing-library/react';
import type { ReactElement } from 'react';
import { ChakraProvider } from '@chakra-ui/react';
import '@testing-library/jest-dom/vitest';
import { system } from '../theme';

// With `test.globals: false` in vite.config.ts, `afterEach` is not injected
// as a global, so @testing-library/react's automatic cleanup registration
// (which only self-registers when it detects a global `afterEach`) never
// runs. Register it explicitly so renders don't leak across tests in the
// same file.
afterEach(() => {
  cleanup();
});

// Starting with the Chakra UI migration, primitives under `components/ui/`
// resolve tokens/recipes from Chakra's context (`useChakraContext`), which
// throws `ContextError` when rendered without a `<ChakraProvider />`
// ancestor. Test files call `render` from `@testing-library/react` directly,
// so this globally wraps that `render` with the app's `ChakraProvider` (same
// `system` used in `main.tsx`) rather than requiring every test file to
// import and wrap manually.
vi.mock('@testing-library/react', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@testing-library/react')>();
  return {
    ...actual,
    render: (ui: ReactElement, options?: RenderOptions) =>
      actual.render(ui, {
        wrapper: ({ children }) => <ChakraProvider value={system}>{children}</ChakraProvider>,
        ...options,
      }),
  };
});

// jsdom doesn't implement ResizeObserver. Chakra's Popover/Select (built on
// Ark UI + floating-ui) call it to reposition on content resize; without a
// stub, any test that opens one throws "ResizeObserver is not defined".
if (typeof globalThis.ResizeObserver === 'undefined') {
  // eslint-disable-next-line no-undef
  globalThis.ResizeObserver = class ResizeObserver {
    // eslint-disable-next-line class-methods-use-this
    observe() {}

    // eslint-disable-next-line class-methods-use-this
    unobserve() {}

    // eslint-disable-next-line class-methods-use-this
    disconnect() {}
  };
}
