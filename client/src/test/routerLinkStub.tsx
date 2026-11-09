import type { ReactNode } from 'react';

// A stand-in for the router's Link, for components that render one but are tested without a
// router around them. It resolves the params into the path the way the router would, so a test
// can assert on the href a tag or a row actually leads to.
//
// Used as the factory of a hoisted mock, which must therefore not close over anything:
//
//   vi.mock('@tanstack/react-router', () => routerLinkStub());
//   const { TopicIndex } = await import('./TopicIndex.tsx');
//
// The dynamic import is what keeps the component from binding the real Link before the mock is
// in place.
export const routerLinkStub = () => ({
  Link: ({
    to,
    params,
    children,
  }: {
    to: string;
    params?: Record<string, string>;
    children: ReactNode;
  }) => (
    <a
      href={Object.entries(params ?? {}).reduce((path, [key, v]) => path.replace(`$${key}`, v), to)}
    >
      {children}
    </a>
  ),
});
