import { redirect } from '@tanstack/react-router';
import type { QueryClient } from '@tanstack/react-query';
import type { AuthUser } from '@nee3/shared-types';
import { authQueryKey } from './queries.ts';

export const requireAuth =
  (queryClient: QueryClient) =>
  ({ location }: { location: { href: string } }): void => {
    const user = queryClient.getQueryData<AuthUser | null>(authQueryKey);
    if (!user) {
      throw redirect({ to: '/login', search: { redirect: location.href } });
    }
  };
