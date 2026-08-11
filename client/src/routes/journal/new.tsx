import { createFileRoute, useNavigate } from '@tanstack/react-router';
import type { CreateEntryRequest } from '@nee3/shared-types';
import { EntryForm } from '../../modules/journal/components/EntryForm/EntryForm.tsx';
import { useCreateEntry, useUpdateEntry } from '../../modules/journal/api/journalHooks.ts';
import { requireAuth } from '../../auth/requireAuth.ts';

function NewEntryPage() {
  const navigate = useNavigate();
  const createEntry = useCreateEntry();
  const updateEntry = useUpdateEntry();

  const handleSubmit = async (input: CreateEntryRequest, existingEntryId?: number) => {
    const entry = existingEntryId
      ? await updateEntry.mutateAsync({ id: existingEntryId, input })
      : await createEntry.mutateAsync(input);
    navigate({ to: '/journal/$entryId', params: { entryId: String(entry.id) } });
  };

  return (
    <div className="mx-auto max-w-2xl p-4">
      <h1 className="mb-4 font-display text-3xl font-semibold text-ink">New entry</h1>
      <EntryForm onSubmit={handleSubmit} />
    </div>
  );
}

export const Route = createFileRoute('/journal/new')({
  component: NewEntryPage,
  beforeLoad: ({ context, location }) => requireAuth(context.queryClient)({ location }),
});
