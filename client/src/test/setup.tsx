import { afterEach, vi } from 'vitest';
import { cleanup, type RenderOptions } from '@testing-library/react';
import type { ReactElement } from 'react';
import { ChakraProvider } from '@chakra-ui/react';
import '@testing-library/jest-dom/vitest';
import { system } from '../theme';
import { MemoryStorage } from './MemoryStorage.ts';

// With `test.globals: false` in vite.config.ts, `afterEach` is not injected
// as a global, so @testing-library/react's automatic cleanup registration
// (which only self-registers when it detects a global `afterEach`) never
// runs. Register it explicitly so renders don't leak across tests in the
// same file.
afterEach(() => {
  cleanup();
  window.localStorage.clear();
});

// Node 22+'s own (opt-out, `--no-experimental-webstorage`) global `localStorage` accessor
// is already present on `globalThis` by the time vitest's jsdom environment installs its
// globals, so jsdom's real, working implementation is skipped as "already defined" - the
// Node one is a no-op without a `--localstorage-file`, so `window.localStorage` resolves to
// `undefined` rather than a Storage. Recovery-buffer-style tests need a real, working
// same-origin store, so swap in a minimal in-memory polyfill whenever the ambient one isn't
// actually functional.
if (typeof window.localStorage?.setItem !== 'function') {
  Object.defineProperty(globalThis, 'localStorage', {
    value: new MemoryStorage(),
    configurable: true,
    writable: true,
  });
}

// Starting with the Chakra UI migration, primitives under `atoms/`
// resolve tokens/recipes from Chakra's context (`useChakraContext`), which
// throws `ContextError` when rendered without a `<ChakraProvider />`
// ancestor. Test files call `render` from `@testing-library/react` directly,
// so this globally wraps that `render` with the app's `ChakraProvider` (same
// `system` used in `main.tsx`) rather than requiring every test file to
// import and wrap manually.
//
// If a caller passes its own `wrapper` (e.g. to add a router or
// query-client context), compose it with `ChakraProvider` instead of
// letting the caller's `wrapper` replace it outright - otherwise the
// `ContextError` this fix exists to prevent would resurface for any test
// that supplies a `wrapper` option.
vi.mock('@testing-library/react', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@testing-library/react')>();
  return {
    ...actual,
    render: (ui: ReactElement, options?: RenderOptions) => {
      const CallerWrapper = options?.wrapper;
      return actual.render(ui, {
        ...options,
        wrapper: ({ children }) => (
          <ChakraProvider value={system}>
            {CallerWrapper ? <CallerWrapper>{children}</CallerWrapper> : children}
          </ChakraProvider>
        ),
      });
    },
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
