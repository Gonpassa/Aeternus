import { createFileRoute, useNavigate } from '@tanstack/react-router';
import type { CreateDreamRequest } from '@nee3/shared-types';
import { DreamForm } from '../../modules/dreams/components/DreamForm/DreamForm.tsx';
import { useCreateDream } from '../../modules/dreams/api/dreamHooks.ts';
import { requireAuth } from '../../auth/requireAuth.ts';
import { PageContainer } from '../../atoms/PageContainer/PageContainer.tsx';
import { Heading } from '../../atoms/Heading/Heading.tsx';

function NewDreamPage() {
  const navigate = useNavigate();
  const createDream = useCreateDream();

  const handleCreate = async (input: CreateDreamRequest) => {
    await createDream.mutateAsync(input);
    navigate({ to: '/dreams' });
  };

  return (
    <PageContainer maxW="4xl" centered>
      <Heading as="h1" mb="4" variant="page">
        Record a dream
      </Heading>
      <DreamForm onCreate={handleCreate} onDiscard={() => navigate({ to: '/dreams' })} />
    </PageContainer>
  );
}

export const Route = createFileRoute('/dreams/new')({
  component: NewDreamPage,
  beforeLoad: ({ context, location }) => requireAuth(context.queryClient)({ location }),
});
