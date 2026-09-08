import { createFileRoute, getRouteApi } from '@tanstack/react-router';
import { format } from 'date-fns';
import { useDream } from '../../modules/dreams/api/dreamHooks.ts';
import { DreamAnalysis } from '../../modules/dreams/components/DreamAnalysis/DreamAnalysis.tsx';
import { requireAuth } from '../../auth/requireAuth.ts';
import { parseIsoDate } from '../../utils/isoDate.ts';
import { Heading } from '../../atoms/Heading/Heading.tsx';
import { LoadingGate } from '../../atoms/LoadingGate/LoadingGate.tsx';
import { PageContainer } from '../../atoms/PageContainer/PageContainer.tsx';
import { Text } from '../../atoms/Text/Text.tsx';

const routeApi = getRouteApi('/dreams/$dreamId');

function DreamAnalysisPage() {
  const { dreamId } = routeApi.useParams();
  const dreamDetail = useDream(Number(dreamId));

  return (
    <PageContainer maxW="4xl" centered>
      {dreamDetail.isPending && <LoadingGate minH="30vh" />}
      {!dreamDetail.isPending && !dreamDetail.data && (
        <Text variant="muted">This dream could not be found.</Text>
      )}
      {dreamDetail.data && (
        <>
          <Heading as="h1" mb="1" variant="page">
            Analyze this dream
          </Heading>
          <Text variant="muted" mb="4">
            {format(parseIsoDate(dreamDetail.data.dream.date), 'MMM d, yyyy')}
          </Text>
          <DreamAnalysis
            dream={dreamDetail.data.dream}
            anchors={dreamDetail.data.anchors}
            analysisPasses={dreamDetail.data.analysisPasses}
          />
        </>
      )}
    </PageContainer>
  );
}

export const Route = createFileRoute('/dreams/$dreamId')({
  component: DreamAnalysisPage,
  beforeLoad: ({ context, location }) => requireAuth(context.queryClient)({ location }),
});
