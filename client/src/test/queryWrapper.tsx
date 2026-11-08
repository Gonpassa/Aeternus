import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';

// A fresh client per wrapper, with retries off so a failing query fails once and the test
// reads the error state rather than waiting out the default backoff. For components that read
// a query of their own - a connections row reaching the note at its other end, say - rendered
// without the app's provider around them.
export const queryWrapper = () => {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  };
};
