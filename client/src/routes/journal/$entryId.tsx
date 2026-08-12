import { createFileRoute, getRouteApi, Link, useNavigate } from '@tanstack/react-router';
import { useState } from 'react';
import { useDeleteEntry, useEntry } from '../../modules/journal/api/journalHooks.ts';
import { EntryView } from '../../modules/journal/components/EntryView/EntryView.tsx';
import { requireAuth } from '../../auth/requireAuth.ts';
import { Button, buttonVariants } from '../../components/ui/button.tsx';
import { cn } from '../../lib/utils.ts';

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
          className={cn(buttonVariants({ variant: 'outline' }))}
        >
          Edit
        </Link>
        {confirmingDelete ? (
          <Button type="button" variant="destructive" onClick={handleDelete}>
            Confirm delete
          </Button>
        ) : (
          <Button
            type="button"
            variant="outline"
            className="border-rust text-rust hover:bg-rust/5"
            onClick={() => setConfirmingDelete(true)}
          >
            Delete
          </Button>
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
