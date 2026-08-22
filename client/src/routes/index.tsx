import { createFileRoute, getRouteApi } from '@tanstack/react-router';
import { Stack } from '../atoms/Stack/Stack.tsx';
import { useAuth } from '../shell/AuthProvider.tsx';
// PROTOTYPE wiring for issue #23 — remove this import and the branch below once a
// variant is chosen and folded into the real dashboard. See shell/dashboard-prototype/.
import { DashboardPrototype } from '../shell/dashboard-prototype/DashboardPrototype.tsx';

export interface IndexSearch {
  variant?: string;
}

const routeApi = getRouteApi('/');

function IndexPage() {
  const { user } = useAuth();
  const { variant } = routeApi.useSearch();

  if (user) {
    return (
      <Stack direction="column" p="4">
        <DashboardPrototype user={user} variant={variant ?? 'A'} />
      </Stack>
    );
  }

  return (
    <Stack direction="column" p="4">
      Aeternus
    </Stack>
  );
}

export const Route = createFileRoute('/')({
  validateSearch: (search: Record<string, unknown>): IndexSearch => ({
    variant: typeof search.variant === 'string' ? search.variant : undefined,
  }),
  component: IndexPage,
});
