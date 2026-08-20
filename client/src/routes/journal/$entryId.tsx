import { createFileRoute, getRouteApi, Link, useNavigate } from '@tanstack/react-router';
import { useDeleteEntry, useEntry } from '../../modules/journal/api/journalHooks.ts';
import { EntryView } from '../../modules/journal/components/EntryView/EntryView.tsx';
import { requireAuth } from '../../auth/requireAuth.ts';
import { Button } from '../../components/ui/Button/Button.tsx';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog/ConfirmDialog.tsx';
import { Stack } from '../../components/ui/Stack/Stack.tsx';
import { Text } from '../../components/ui/Text/Text.tsx';

const routeApi = getRouteApi('/journal/$entryId');

function EntryDetailPage() {
  const { entryId } = routeApi.useParams();
  const navigate = useNavigate();
  const { data: entry, isLoading } = useEntry(Number(entryId));
  const deleteEntry = useDeleteEntry();

  const handleDelete = async () => {
    await deleteEntry.mutateAsync(Number(entryId));
    navigate({ to: '/journal', search: { page: 1 } });
  };

  if (isLoading || !entry) {
    return (
      <Text p="4" variant="muted">
        Loading...
      </Text>
    );
  }

  return (
    <Stack direction="column" p="4">
      <Stack mb="4" maxW="2xl" align="center" gap="3">
        <Button asChild variant="outline">
          <Link to="/journal/$entryId/edit" params={{ entryId }}>
            Edit
          </Link>
        </Button>
        <ConfirmDialog
          trigger={
            <Button
              type="button"
              variant="outline"
              borderColor="rust"
              color="rust"
              _hover={{ bg: 'rust/5' }}
            >
              Delete
            </Button>
          }
          title="Delete this entry?"
          description="This action cannot be undone."
          confirmLabel="Delete"
          destructive
          onConfirm={handleDelete}
        />
      </Stack>
      <EntryView entry={entry} />
    </Stack>
  );
}

export const Route = createFileRoute('/journal/$entryId')({
  component: EntryDetailPage,
  beforeLoad: ({ context, location }) => requireAuth(context.queryClient)({ location }),
});
