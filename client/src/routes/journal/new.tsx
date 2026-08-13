import { createFileRoute, useNavigate } from '@tanstack/react-router';
import type { CreateEntryRequest } from '@nee3/shared-types';
import { Box, Heading } from '@chakra-ui/react';
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
    <Box mx="auto" maxW="2xl" p="4">
      <Heading as="h1" mb="4" fontFamily="heading" fontSize="3xl" fontWeight="semibold" color="ink">
        New entry
      </Heading>
      <EntryForm
        onSubmit={handleSubmit}
        onDiscard={() => navigate({ to: '/journal', search: { page: 1 } })}
      />
    </Box>
  );
}

export const Route = createFileRoute('/journal/new')({
  component: NewEntryPage,
  beforeLoad: ({ context, location }) => requireAuth(context.queryClient)({ location }),
});
