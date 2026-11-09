import { useState } from 'react';
import { createFileRoute } from '@tanstack/react-router';
import { requireAuth } from '../../../auth/requireAuth.ts';
import { useAnswerReview } from '../../../modules/notes/api/useAnswerReview.ts';
import { useReviewQueue } from '../../../modules/notes/api/reviewHooks.ts';
import { ReviewPass } from '../../../modules/notes/components/ReviewPass/ReviewPass.tsx';
import { Heading } from '../../../atoms/Heading/Heading.tsx';
import { LoadingGate } from '../../../atoms/LoadingGate/LoadingGate.tsx';
import { PageContainer } from '../../../atoms/PageContainer/PageContainer.tsx';
import { Stack } from '../../../atoms/Stack/Stack.tsx';
import { Text } from '../../../atoms/Text/Text.tsx';

function ReviewPage() {
  const queue = useReviewQueue();
  const answer = useAnswerReview();
  // A pass is the queue as it was read, so starting another is a fresh read with a fresh
  // card - the key is what resets the index and the sitting's tally.
  const [passId, setPassId] = useState(0);

  return (
    <PageContainer maxW="2xl" centered>
      <Stack direction="column" gap="1" mb="6">
        <Text variant="eyebrow" color="rust">
          Notes
        </Text>
        <Heading as="h1" variant="page">
          Review
        </Heading>
      </Stack>

      {queue.isPending && <LoadingGate minH="30vh" />}
      {/* Said to have failed rather than shown as an empty box: the empty state invites a
          first Source, which is the wrong thing to tell someone whose notes are merely
          unreachable. */}
      {queue.isError && <Text variant="muted">Your notes could not be read just now.</Text>}
      {queue.data && (
        <ReviewPass
          key={passId}
          notes={queue.data.notes}
          dueCount={queue.data.dueCount}
          onNothingHere={answer.nothingHere}
          onLink={answer.link}
          onWritePermanentNote={answer.writePermanentNote}
          onClearOpenQuestion={answer.clearOpenQuestion}
          onStartAgain={async () => {
            await queue.refetch();
            setPassId((current) => current + 1);
          }}
        />
      )}
    </PageContainer>
  );
}

export const Route = createFileRoute('/notes/review/')({
  component: ReviewPage,
  beforeLoad: ({ context, location }) => requireAuth(context.queryClient)({ location }),
});
