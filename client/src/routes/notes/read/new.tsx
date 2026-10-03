import { createFileRoute, useNavigate } from '@tanstack/react-router';
import type { CreateSourceRequest } from '@nee3/shared-types';
import { requireAuth } from '../../../auth/requireAuth.ts';
import { useCreateSource } from '../../../modules/notes/api/sourceHooks.ts';
import { SourceForm } from '../../../modules/notes/components/SourceForm/SourceForm.tsx';
import { Heading } from '../../../atoms/Heading/Heading.tsx';
import { PageContainer } from '../../../atoms/PageContainer/PageContainer.tsx';

function NewSourcePage() {
  const navigate = useNavigate();
  const createSource = useCreateSource();

  // Straight to the new Source's reading page rather than back to the catalog: filing a
  // Source is something you do in order to read it, so that is where the form lets you out.
  const handleCreate = async (input: CreateSourceRequest) => {
    const source = await createSource.mutateAsync(input);
    navigate({ to: '/notes/read/$sourceId', params: { sourceId: String(source.id) } });
  };

  return (
    <PageContainer maxW="4xl" centered>
      <Heading as="h1" mb="4" variant="page">
        New Source
      </Heading>
      <SourceForm onSubmit={handleCreate} onDiscard={() => navigate({ to: '/notes/read' })} />
    </PageContainer>
  );
}

export const Route = createFileRoute('/notes/read/new')({
  component: NewSourcePage,
  beforeLoad: ({ context, location }) => requireAuth(context.queryClient)({ location }),
});
