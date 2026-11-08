import { createFileRoute, Link } from '@tanstack/react-router';
import { requireAuth } from '../../../auth/requireAuth.ts';
import { useSources } from '../../../modules/notes/api/sourceHooks.ts';
import { SourceCatalog } from '../../../modules/notes/components/SourceCatalog/SourceCatalog.tsx';
import { Button } from '../../../atoms/Button/Button.tsx';
import { Heading } from '../../../atoms/Heading/Heading.tsx';
import { LoadingGate } from '../../../atoms/LoadingGate/LoadingGate.tsx';
import { PageContainer } from '../../../atoms/PageContainer/PageContainer.tsx';
import { Stack } from '../../../atoms/Stack/Stack.tsx';
import { Text } from '../../../atoms/Text/Text.tsx';

function ReadCatalogPage() {
  const sources = useSources();
  const hasSources = (sources.data?.length ?? 0) > 0;

  return (
    <PageContainer maxW="4xl" centered>
      <Stack mb="4" align="center" justify="space-between">
        <Stack direction="column" gap="1">
          <Text variant="eyebrow" color="rust">
            Notes
          </Text>
          <Heading as="h1" variant="page">
            Read
          </Heading>
        </Stack>
        {/* Only alongside a populated catalog: the empty state carries its own invitation,
            and two "add a Source" buttons on one page is one too many. */}
        {hasSources && (
          <Button asChild>
            <Link to="/notes/read/new">Add a Source</Link>
          </Button>
        )}
      </Stack>

      {sources.isPending && <LoadingGate minH="30vh" />}
      {/* A failed request is said to have failed rather than shown as an empty shelf: the
          empty state invites a first Source, which is the wrong thing to tell someone whose
          catalog is full and merely unreachable. */}
      {sources.isError && <Text variant="muted">The catalog could not be loaded.</Text>}
      {!sources.isPending && !sources.isError && <SourceCatalog sources={sources.data ?? []} />}
    </PageContainer>
  );
}

export const Route = createFileRoute('/notes/read/')({
  component: ReadCatalogPage,
  beforeLoad: ({ context, location }) => requireAuth(context.queryClient)({ location }),
});
