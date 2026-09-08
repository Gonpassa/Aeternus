import { createFileRoute, Link } from '@tanstack/react-router';
import { useDreams } from '../../modules/dreams/api/dreamHooks.ts';
import { requireAuth } from '../../auth/requireAuth.ts';
import { DreamTimeline } from '../../modules/dreams/components/DreamTimeline/DreamTimeline.tsx';
import { Button } from '../../atoms/Button/Button.tsx';
import { LoadingGate } from '../../atoms/LoadingGate/LoadingGate.tsx';
import { PageContainer } from '../../atoms/PageContainer/PageContainer.tsx';
import { Stack } from '../../atoms/Stack/Stack.tsx';
import { Heading } from '../../atoms/Heading/Heading.tsx';
import { Text } from '../../atoms/Text/Text.tsx';

function DreamsIndexPage() {
  const dreams = useDreams();

  return (
    <PageContainer maxW="4xl" centered>
      <Stack mb="4" align="center" justify="space-between">
        <Heading as="h1" variant="page">
          Dream Journal
        </Heading>
        <Button asChild bg="inkBlue" px="3" py="2" color="paper">
          <Link to="/dreams/new">Record a dream</Link>
        </Button>
      </Stack>

      {dreams.isPending && <LoadingGate minH="30vh" />}
      {!dreams.isPending && (dreams.data?.length ?? 0) === 0 && (
        <Text variant="muted">No dreams recorded yet.</Text>
      )}
      {!dreams.isPending && (dreams.data?.length ?? 0) > 0 && (
        <DreamTimeline dreams={dreams.data ?? []} />
      )}
    </PageContainer>
  );
}

export const Route = createFileRoute('/dreams/')({
  component: DreamsIndexPage,
  beforeLoad: ({ context, location }) => requireAuth(context.queryClient)({ location }),
});
