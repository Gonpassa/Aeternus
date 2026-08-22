import { createFileRoute, getRouteApi, Link, useNavigate } from '@tanstack/react-router';
import { useDeleteEntry, useEntry } from '../../modules/journal/api/journalHooks.ts';
import { EntryView } from '../../modules/journal/components/EntryView/EntryView.tsx';
import { requireAuth } from '../../auth/requireAuth.ts';
import { Button } from '../../components/ui/Button/Button.tsx';
import { Dialog } from '../../components/ui/Dialog/Dialog.tsx';
import { useDialogState } from '../../components/ui/Dialog/useDialogState.ts';
import { Stack } from '../../components/ui/Stack/Stack.tsx';
import { Text } from '../../components/ui/Text/Text.tsx';

const routeApi = getRouteApi('/journal/$entryId');

function EntryDetailPage() {
  const { entryId } = routeApi.useParams();
  const navigate = useNavigate();
  const deleteEntry = useDeleteEntry();
  const { data: entry, isLoading } = useEntry(Number(entryId), {
    enabled: !deleteEntry.isPending && !deleteEntry.isSuccess,
  });
  const deleteDialog = useDialogState();

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
        <Button
          type="button"
          variant="outline"
          borderColor="rust"
          color="rust"
          _hover={{ bg: 'rust/5' }}
          onClick={deleteDialog.openDialog}
        >
          Delete
        </Button>
        <Dialog
          open={deleteDialog.open}
          onClose={deleteEntry.isPending ? () => {} : deleteDialog.closeDialog}
          variant="small"
          role="alertdialog"
          header={{ title: 'Delete this entry?' }}
          footer={{
            secondary: {
              label: 'Cancel',
              onClick: deleteDialog.closeDialog,
              disabled: deleteEntry.isPending,
            },
            primary: {
              label: 'Delete',
              variant: 'destructive',
              onClick: handleDelete,
              loading: deleteEntry.isPending,
              disabled: deleteEntry.isPending,
            },
          }}
        >
          <Text fontFamily="body" color="inkSoft">
            This action cannot be undone.
          </Text>
        </Dialog>
      </Stack>
      <EntryView entry={entry} />
    </Stack>
  );
}

export const Route = createFileRoute('/journal/$entryId')({
  component: EntryDetailPage,
  beforeLoad: ({ context, location }) => requireAuth(context.queryClient)({ location }),
});
