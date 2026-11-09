import { createFileRoute } from '@tanstack/react-router';
import { requireAuth } from '../../../auth/requireAuth.ts';
import { useTopics } from '../../../modules/notes/api/topicHooks.ts';
import { TopicIndex } from '../../../modules/notes/components/TopicIndex/TopicIndex.tsx';
import { Heading } from '../../../atoms/Heading/Heading.tsx';
import { LoadingGate } from '../../../atoms/LoadingGate/LoadingGate.tsx';
import { PageContainer } from '../../../atoms/PageContainer/PageContainer.tsx';
import { Stack } from '../../../atoms/Stack/Stack.tsx';
import { Text } from '../../../atoms/Text/Text.tsx';

function TopicIndexPage() {
  const topics = useTopics();

  return (
    <PageContainer maxW="2xl" centered>
      <Stack direction="column" gap="1" mb="4">
        <Text variant="eyebrow" color="rust">
          Notes
        </Text>
        <Heading as="h1" variant="page">
          Topics
        </Heading>
      </Stack>

      {topics.isPending && <LoadingGate minH="30vh" />}
      {/* A failed request is said to have failed rather than shown as an empty vocabulary:
          the empty state invites a first Topic, which is the wrong thing to tell someone
          whose list is merely unreachable. */}
      {topics.isError && <Text variant="muted">The Topics could not be loaded.</Text>}
      {!topics.isPending && !topics.isError && <TopicIndex topics={topics.data ?? []} />}
    </PageContainer>
  );
}

export const Route = createFileRoute('/notes/topics/')({
  component: TopicIndexPage,
  beforeLoad: ({ context, location }) => requireAuth(context.queryClient)({ location }),
});
