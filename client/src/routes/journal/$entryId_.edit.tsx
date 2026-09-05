import { createFileRoute, getRouteApi, useNavigate } from '@tanstack/react-router';
import type { CreateEntryRequest } from '@nee3/shared-types';
import { EntryForm } from '../../modules/journal/components/EntryForm/EntryForm.tsx';
import {
  useDeleteEntry,
  useEntry,
  useUpdateEntry,
} from '../../modules/journal/api/journalHooks.ts';
import { requireAuth } from '../../auth/requireAuth.ts';
import { PageContainer } from '../../atoms/PageContainer/PageContainer.tsx';
import { Heading } from '../../atoms/Heading/Heading.tsx';
import { Text } from '../../atoms/Text/Text.tsx';

const routeApi = getRouteApi('/journal/$entryId_/edit');

function EditEntryPage() {
  const { entryId } = routeApi.useParams();
  const navigate = useNavigate();
  const { data: entry, isLoading } = useEntry(Number(entryId));
  const updateEntry = useUpdateEntry();
  const deleteEntry = useDeleteEntry();

  if (isLoading || !entry) {
    return (
      <Text p="4" variant="muted">
        Loading...
      </Text>
    );
  }

  const handleUpdate = async (id: number, input: CreateEntryRequest) => {
    await updateEntry.mutateAsync({ id, input });
    navigate({ to: '/journal/$entryId', params: { entryId } });
  };

  const handleDelete = async () => {
    await deleteEntry.mutateAsync(entry.id);
    navigate({ to: '/journal' });
  };

  return (
    <PageContainer>
      <Heading as="h1" mb="4" variant="page">
        Edit entry
      </Heading>
      {/* `key` forces a remount on navigation between two edit routes for different
          entries when TanStack Router reuses this component instance (e.g. the target
          entry is already cached, so the isLoading gate above never re-triggers) - without
          it, EntryForm's internal state (including its recovery buffer key) would keep
          referencing the entry this instance was first mounted for. */}
      <EntryForm
        key={entry.id}
        initialEntry={entry}
        onUpdate={handleUpdate}
        onDelete={handleDelete}
      />
    </PageContainer>
  );
}

export const Route = createFileRoute('/journal/$entryId_/edit')({
  component: EditEntryPage,
  beforeLoad: ({ context, location }) => requireAuth(context.queryClient)({ location }),
});
