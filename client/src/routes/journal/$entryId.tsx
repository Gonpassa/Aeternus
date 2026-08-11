import { createFileRoute, getRouteApi, Link, useNavigate } from '@tanstack/react-router';
import { useState } from 'react';
import { useDeleteEntry, useEntry } from '../../modules/journal/api/journalHooks.ts';
import { EntryView } from '../../modules/journal/components/EntryView/EntryView.tsx';
import { requireAuth } from '../../auth/requireAuth.ts';

const routeApi = getRouteApi('/journal/$entryId');

function EntryDetailPage() {
  const { entryId } = routeApi.useParams();
  const navigate = useNavigate();
  const { data: entry, isLoading } = useEntry(Number(entryId));
  const deleteEntry = useDeleteEntry();
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  const handleDelete = async () => {
    await deleteEntry.mutateAsync(Number(entryId));
    navigate({ to: '/journal', search: { page: 1 } });
  };

  if (isLoading || !entry) {
    return <p className="p-4 text-ink-soft">Loading...</p>;
  }

  return (
    <div className="p-4">
      <div className="mx-auto mb-4 flex max-w-2xl items-center gap-3">
        <Link
          to="/journal/$entryId/edit"
          params={{ entryId }}
          className="border border-ink-blue px-3 py-2 font-mono text-xs uppercase text-ink-blue"
        >
          Edit
        </Link>
        {confirmingDelete ? (
          <button
            type="button"
            onClick={handleDelete}
            className="bg-rust px-3 py-2 font-mono text-xs uppercase text-paper"
          >
            Confirm delete
          </button>
        ) : (
          <button
            type="button"
            onClick={() => setConfirmingDelete(true)}
            className="border border-rust px-3 py-2 font-mono text-xs uppercase text-rust"
          >
            Delete
          </button>
        )}
      </div>
      <EntryView entry={entry} />
    </div>
  );
}

export const Route = createFileRoute('/journal/$entryId')({
  component: EntryDetailPage,
  beforeLoad: ({ context, location }) => requireAuth(context.queryClient)({ location }),
});
