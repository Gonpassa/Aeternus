import { createFileRoute, getRouteApi, useNavigate } from '@tanstack/react-router';
import type { CreateEntryRequest } from '@nee3/shared-types';
import { Box, Heading, Text } from '@chakra-ui/react';
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
    return (
      <Text p="4" color="inkSoft">
        Loading...
      </Text>
    );
  }

  const handleSubmit = async (input: CreateEntryRequest) => {
    await updateEntry.mutateAsync({ id: entry.id, input });
    navigate({ to: '/journal/$entryId', params: { entryId } });
  };

  return (
    <Box mx="auto" maxW="2xl" p="4">
      <Heading as="h1" mb="4" fontFamily="heading" fontSize="3xl" fontWeight="semibold" color="ink">
        Edit entry
      </Heading>
      <EntryForm
        initialEntry={entry}
        onSubmit={handleSubmit}
        onDiscard={() => navigate({ to: '/journal/$entryId', params: { entryId } })}
      />
    </Box>
  );
}

export const Route = createFileRoute('/journal/$entryId/edit')({
  component: EditEntryPage,
  beforeLoad: ({ context, location }) => requireAuth(context.queryClient)({ location }),
});
