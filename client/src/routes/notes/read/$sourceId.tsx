import { createFileRoute, getRouteApi } from '@tanstack/react-router';
import { requireAuth } from '../../../auth/requireAuth.ts';
import { useCreateLiteratureNote, useSource } from '../../../modules/notes/api/sourceHooks.ts';
import { useCreatePermanentNote } from '../../../modules/notes/api/noteHooks.ts';
import { SourceReading } from '../../../modules/notes/components/SourceReading/SourceReading.tsx';
import { LoadingGate } from '../../../atoms/LoadingGate/LoadingGate.tsx';
import { PageContainer } from '../../../atoms/PageContainer/PageContainer.tsx';
import { Text } from '../../../atoms/Text/Text.tsx';

const routeApi = getRouteApi('/notes/read/$sourceId');

function SourceReadingPage() {
  const { sourceId } = routeApi.useParams();
  const { data, isPending } = useSource(Number(sourceId));
  const createNote = useCreateLiteratureNote(Number(sourceId));
  const createPermanentNote = useCreatePermanentNote(Number(sourceId));

  return (
    <PageContainer maxW="4xl" centered>
      {isPending && <LoadingGate minH="30vh" />}
      {!isPending && !data && <Text variant="muted">This Source could not be found.</Text>}
      {data && (
        <SourceReading
          source={data.source}
          notes={data.notes}
          sections={data.sections}
          onFile={async (input) => {
            await createNote.mutateAsync(input);
          }}
          onWritePermanentNote={async (input) => {
            await createPermanentNote.mutateAsync(input);
          }}
        />
      )}
    </PageContainer>
  );
}

export const Route = createFileRoute('/notes/read/$sourceId')({
  component: SourceReadingPage,
  beforeLoad: ({ context, location }) => requireAuth(context.queryClient)({ location }),
});
