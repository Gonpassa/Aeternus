import { createRootRouteWithContext, Outlet } from '@tanstack/react-router';
import type { QueryClient } from '@tanstack/react-query';
import { lazy, Suspense } from 'react';
import { AuthProvider } from '../shell/AuthProvider.tsx';
import { Layout } from '../shell/Layout.tsx';

// import.meta.env.PROD is statically replaced at build time, so Vite/Rollup
// dead-code-eliminates the dynamic import below entirely from the production
// bundle rather than just skipping it at runtime.
const TanStackRouterDevtools = import.meta.env.PROD
  ? () => null
  : lazy(() =>
      import('@tanstack/router-devtools').then((mod) => ({
        default: mod.TanStackRouterDevtools,
      })),
    );

export interface RouterContext {
  queryClient: QueryClient;
}

export const Route = createRootRouteWithContext<RouterContext>()({
  component: () => (
    <AuthProvider>
      <Layout>
        <Outlet />
      </Layout>
      <Suspense fallback={null}>
        <TanStackRouterDevtools />
      </Suspense>
    </AuthProvider>
  ),
});
