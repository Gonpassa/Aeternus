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
