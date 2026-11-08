import { createFileRoute, getRouteApi } from '@tanstack/react-router';
import { requireAuth } from '../../../auth/requireAuth.ts';
import { useSource } from '../../../modules/notes/api/sourceHooks.ts';
import { SourceReading } from '../../../modules/notes/components/SourceReading/SourceReading.tsx';
import { LoadingGate } from '../../../atoms/LoadingGate/LoadingGate.tsx';
import { PageContainer } from '../../../atoms/PageContainer/PageContainer.tsx';
import { Text } from '../../../atoms/Text/Text.tsx';

const routeApi = getRouteApi('/notes/read/$sourceId');

function SourceReadingPage() {
  const { sourceId } = routeApi.useParams();
  const { data, isPending } = useSource(Number(sourceId));

  return (
    <PageContainer maxW="4xl" centered>
      {isPending && <LoadingGate minH="30vh" />}
      {!isPending && !data && <Text variant="muted">This Source could not be found.</Text>}
      {data && <SourceReading source={data.source} />}
    </PageContainer>
  );
}

export const Route = createFileRoute('/notes/read/$sourceId')({
  component: SourceReadingPage,
  beforeLoad: ({ context, location }) => requireAuth(context.queryClient)({ location }),
});
