import { createFileRoute, getRouteApi, Link } from '@tanstack/react-router';
import { format } from 'date-fns';
import { useDream } from '../../modules/dreams/api/dreamHooks.ts';
import { DreamAnalysis } from '../../modules/dreams/components/DreamAnalysis/DreamAnalysis.tsx';
import { requireAuth } from '../../auth/requireAuth.ts';
import { parseIsoDate } from '../../utils/isoDate.ts';
import { Button } from '../../atoms/Button/Button.tsx';
import { Heading } from '../../atoms/Heading/Heading.tsx';
import { LoadingGate } from '../../atoms/LoadingGate/LoadingGate.tsx';
import { PageContainer } from '../../atoms/PageContainer/PageContainer.tsx';
import { Stack } from '../../atoms/Stack/Stack.tsx';
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
          <Stack justify="space-between" align="flex-start" mb="1">
            <Heading as="h1" variant="page">
              Analyze this dream
            </Heading>
            <Button asChild variant="outline">
              <Link to="/dreams/$dreamId/edit" params={{ dreamId }}>
                Edit narrative
              </Link>
            </Button>
          </Stack>
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
