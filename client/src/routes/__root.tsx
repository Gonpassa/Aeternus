import { createRootRoute, Outlet } from '@tanstack/react-router';
import { TanStackRouterDevtools } from '@tanstack/router-devtools';
import { AuthProvider } from '../shell/AuthProvider.tsx';
import { Layout } from '../shell/Layout.tsx';

export const Route = createRootRoute({
  component: () => (
    <AuthProvider>
      <Layout>
        <Outlet />
      </Layout>
      <TanStackRouterDevtools />
    </AuthProvider>
  ),
});
