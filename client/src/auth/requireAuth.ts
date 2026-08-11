import { redirect } from '@tanstack/react-router';
import type { QueryClient } from '@tanstack/react-query';
import { authQueryOptions } from './queries.ts';

export const requireAuth =
  (queryClient: QueryClient) =>
  async ({ location }: { location: { href: string } }): Promise<void> => {
    const user = await queryClient.ensureQueryData(authQueryOptions);
    if (!user) {
      throw redirect({ to: '/login', search: { redirect: location.href } });
    }
  };
