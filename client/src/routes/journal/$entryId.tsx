import { createFileRoute, getRouteApi, Link, useNavigate } from '@tanstack/react-router';
import { useState } from 'react';
import { Box, Flex, Text } from '@chakra-ui/react';
import { useDeleteEntry, useEntry } from '../../modules/journal/api/journalHooks.ts';
import { EntryView } from '../../modules/journal/components/EntryView/EntryView.tsx';
import { requireAuth } from '../../auth/requireAuth.ts';
import { Button } from '../../components/ui/button.tsx';

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
    return (
      <Text p="4" color="inkSoft">
        Loading...
      </Text>
    );
  }

  return (
    <Box p="4">
      <Flex mx="auto" mb="4" maxW="2xl" align="center" gap="3">
        <Button asChild variant="outline">
          <Link to="/journal/$entryId/edit" params={{ entryId }}>
            Edit
          </Link>
        </Button>
        {confirmingDelete ? (
          <Button type="button" variant="destructive" onClick={handleDelete}>
            Confirm delete
          </Button>
        ) : (
          <Button
            type="button"
            variant="outline"
            borderColor="rust"
            color="rust"
            _hover={{ bg: 'rust/5' }}
            onClick={() => setConfirmingDelete(true)}
          >
            Delete
          </Button>
        )}
      </Flex>
      <EntryView entry={entry} />
    </Box>
  );
}

export const Route = createFileRoute('/journal/$entryId')({
  component: EntryDetailPage,
  beforeLoad: ({ context, location }) => requireAuth(context.queryClient)({ location }),
});
