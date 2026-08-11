import { createFileRoute, getRouteApi, useNavigate } from '@tanstack/react-router';
import type { CreateEntryRequest } from '@nee3/shared-types';
import { EntryForm } from '../../modules/journal/components/EntryForm/EntryForm.tsx';
import { useEntry, useUpdateEntry } from '../../modules/journal/api/journalHooks.ts';
import { requireAuth } from '../../auth/requireAuth.ts';

const routeApi = getRouteApi('/journal/$entryId/edit');

function EditEntryPage() {
  const { entryId } = routeApi.useParams();
  const navigate = useNavigate();
  const { data: entry, isLoading } = useEntry(Number(entryId));
  const updateEntry = useUpdateEntry();

  if (isLoading || !entry) {
    return <p className="p-4 text-ink-soft">Loading...</p>;
  }

  const handleSubmit = async (input: CreateEntryRequest) => {
    await updateEntry.mutateAsync({ id: entry.id, input });
    navigate({ to: '/journal/$entryId', params: { entryId } });
  };

  return (
    <div className="mx-auto max-w-2xl p-4">
      <h1 className="mb-4 font-display text-3xl font-semibold text-ink">Edit entry</h1>
      <EntryForm initialEntry={entry} onSubmit={handleSubmit} />
    </div>
  );
}

export const Route = createFileRoute('/journal/$entryId/edit')({
  component: EditEntryPage,
  beforeLoad: ({ context, location }) => requireAuth(context.queryClient)({ location }),
});
