import { createFileRoute, getRouteApi, useNavigate } from '@tanstack/react-router';
import { useDream } from '../../modules/dreams/api/dreamHooks.ts';
import { DreamEdit } from '../../modules/dreams/components/DreamEdit/DreamEdit.tsx';
import { requireAuth } from '../../auth/requireAuth.ts';
import { Heading } from '../../atoms/Heading/Heading.tsx';
import { LoadingGate } from '../../atoms/LoadingGate/LoadingGate.tsx';
import { PageContainer } from '../../atoms/PageContainer/PageContainer.tsx';
import { Text } from '../../atoms/Text/Text.tsx';

const routeApi = getRouteApi('/dreams/$dreamId_/edit');

function DreamEditPage() {
  const { dreamId } = routeApi.useParams();
  const navigate = useNavigate();
  const { data: dreamDetail, isPending } = useDream(Number(dreamId));

  const backToAnalysis = () => {
    navigate({ to: '/dreams/$dreamId', params: { dreamId } });
  };

  return (
    <PageContainer maxW="4xl" centered>
      {isPending && <LoadingGate minH="30vh" />}
      {!isPending && !dreamDetail && <Text variant="muted">This dream could not be found.</Text>}
      {dreamDetail && (
        <>
          <Heading as="h1" mb="4" variant="page">
            Edit narrative
          </Heading>
          {/* `key` forces a remount when TanStack Router reuses this component instance
              across a navigation between edit routes for two different dreams (the target
              already cached, so the isPending gate never re-triggers) - without it,
              DreamForm's internal RHF state would keep the first dream's values. */}
          <DreamEdit
            key={dreamDetail.dream.id}
            dream={dreamDetail.dream}
            anchors={dreamDetail.anchors}
            onSaved={backToAnalysis}
            onCancel={backToAnalysis}
          />
        </>
      )}
    </PageContainer>
  );
}

export const Route = createFileRoute('/dreams/$dreamId_/edit')({
  component: DreamEditPage,
  beforeLoad: ({ context, location }) => requireAuth(context.queryClient)({ location }),
});
