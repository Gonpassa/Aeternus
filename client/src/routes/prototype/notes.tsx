// PROTOTYPE route for issue #67 - throwaway, dev-only. See modules/notes-prototype/.
import { createFileRoute, getRouteApi, redirect } from '@tanstack/react-router';
import { NotesPrototype } from '../../modules/notes-prototype/NotesPrototype.tsx';
import { requireAuth } from '../../auth/requireAuth.ts';

export interface NotesPrototypeSearch {
  variant?: string;
}

const routeApi = getRouteApi('/prototype/notes');

function NotesPrototypePage() {
  const { variant } = routeApi.useSearch();
  return <NotesPrototype variant={variant ?? 'A'} />;
}

export const Route = createFileRoute('/prototype/notes')({
  validateSearch: (search: Record<string, unknown>): NotesPrototypeSearch => ({
    variant: typeof search.variant === 'string' ? search.variant : undefined,
  }),
  beforeLoad: async ({ context, location }) => {
    if (import.meta.env.PROD) throw redirect({ to: '/' });
    await requireAuth(context.queryClient)({ location });
  },
  component: NotesPrototypePage,
});
