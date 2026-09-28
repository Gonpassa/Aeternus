// PROTOTYPE route for issue #73 - throwaway, dev-only. See modules/notes-capture-prototype/.
import { createFileRoute, getRouteApi, redirect } from '@tanstack/react-router';
import { NotesCapturePrototype } from '../../modules/notes-capture-prototype/NotesCapturePrototype.tsx';
import { requireAuth } from '../../auth/requireAuth.ts';

export interface NotesCaptureSearch {
  variant?: string;
}

const routeApi = getRouteApi('/prototype/notes-capture');

function NotesCapturePage() {
  const { variant } = routeApi.useSearch();
  return <NotesCapturePrototype variant={variant ?? 'A'} />;
}

export const Route = createFileRoute('/prototype/notes-capture')({
  validateSearch: (search: Record<string, unknown>): NotesCaptureSearch => ({
    variant: typeof search.variant === 'string' ? search.variant : undefined,
  }),
  beforeLoad: async ({ context, location }) => {
    if (import.meta.env.PROD) throw redirect({ to: '/' });
    await requireAuth(context.queryClient)({ location });
  },
  component: NotesCapturePage,
});
