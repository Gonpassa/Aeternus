import { createFileRoute, getRouteApi, useNavigate } from '@tanstack/react-router';
import { requireAuth } from '../../../auth/requireAuth.ts';
import {
  useDeleteTopic,
  useRenameTopic,
  useTopic,
  useTopics,
} from '../../../modules/notes/api/topicHooks.ts';
import { TopicView } from '../../../modules/notes/components/TopicView/TopicView.tsx';
import { LoadingGate } from '../../../atoms/LoadingGate/LoadingGate.tsx';
import { PageContainer } from '../../../atoms/PageContainer/PageContainer.tsx';
import { Text } from '../../../atoms/Text/Text.tsx';

const routeApi = getRouteApi('/notes/topics/$topicId');

function TopicPage() {
  const { topicId } = routeApi.useParams();
  const navigate = useNavigate();
  const id = Number(topicId);
  const { data, isPending } = useTopic(id);
  const vocabulary = useTopics();
  const renameTopic = useRenameTopic();
  const deleteTopic = useDeleteTopic();

  return (
    <PageContainer maxW="2xl" centered>
      {isPending && <LoadingGate minH="30vh" />}
      {!isPending && !data && <Text variant="muted">This Topic could not be found.</Text>}
      {data && (
        <TopicView
          detail={data}
          vocabulary={vocabulary.data ?? []}
          onRename={async (name) => {
            const result = await renameTopic.mutateAsync({ topicId: id, input: { name } });
            // A merge leaves this route pointing at a Topic that is gone, so the page follows
            // the Topic that survived rather than showing a Topic that could not be found.
            if (result.merged) {
              await navigate({
                to: '/notes/topics/$topicId',
                params: { topicId: String(result.topic.id) },
                replace: true,
              });
            }
          }}
          // Back to the index: the word this page was about is no longer in the vocabulary,
          // and nothing was deleted with it.
          onDelete={async () => {
            await deleteTopic.mutateAsync(id);
            await navigate({ to: '/notes/topics' });
          }}
        />
      )}
    </PageContainer>
  );
}

export const Route = createFileRoute('/notes/topics/$topicId')({
  component: TopicPage,
  beforeLoad: ({ context, location }) => requireAuth(context.queryClient)({ location }),
});
