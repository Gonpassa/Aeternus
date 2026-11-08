import { createFileRoute, getRouteApi, useNavigate } from '@tanstack/react-router';
import { requireAuth } from '../../../auth/requireAuth.ts';
import {
  useCreateLiteratureNote,
  useDeleteLiteratureNote,
  useDeleteSource,
  useSource,
  useUpdateLiteratureNote,
  useUpdateSource,
} from '../../../modules/notes/api/sourceHooks.ts';
import { SourceReading } from '../../../modules/notes/components/SourceReading/SourceReading.tsx';
import { LoadingGate } from '../../../atoms/LoadingGate/LoadingGate.tsx';
import { PageContainer } from '../../../atoms/PageContainer/PageContainer.tsx';
import { Text } from '../../../atoms/Text/Text.tsx';

const routeApi = getRouteApi('/notes/read/$sourceId');

function SourceReadingPage() {
  const { sourceId } = routeApi.useParams();
  const navigate = useNavigate();
  const id = Number(sourceId);
  const { data, isPending } = useSource(id);
  const createNote = useCreateLiteratureNote(id);
  const updateNote = useUpdateLiteratureNote(id);
  const deleteNote = useDeleteLiteratureNote(id);
  const updateSource = useUpdateSource(id);
  const deleteSource = useDeleteSource();

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
          onCorrectNote={async (noteId, input) => {
            await updateNote.mutateAsync({ noteId, input });
          }}
          onDeleteNote={async (noteId) => {
            await deleteNote.mutateAsync(noteId);
          }}
          onCorrectSource={async (input) => {
            await updateSource.mutateAsync(input);
          }}
          // Back to the catalog: the page the deleted Source was being read on has nothing
          // left to show, since its notes went with it (#70).
          onDeleteSource={async () => {
            await deleteSource.mutateAsync(id);
            await navigate({ to: '/notes/read' });
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
