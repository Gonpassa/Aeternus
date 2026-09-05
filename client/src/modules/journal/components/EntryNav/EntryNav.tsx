import { Link } from '@tanstack/react-router';
import { Button } from '../../../../atoms/Button/Button.tsx';
import { Stack } from '../../../../atoms/Stack/Stack.tsx';

export interface EntryNavProps {
  hasNext: boolean;
  hasPrevious: boolean;
  nextEntryId: number | null;
  previousEntryId: number | null;
}

// Presentational Next/Previous navigation for the entry detail page's chronological
// neighbors (see CONTEXT.md's "Chronological neighbor" term). This component knows
// nothing about dates or fetching - only whether each direction is available and which
// entry id to route to. Both buttons always render; each is disabled (not hidden) when
// its direction has no neighbor.
export function EntryNav({ hasNext, hasPrevious, nextEntryId, previousEntryId }: EntryNavProps) {
  return (
    <Stack gap="2">
      {hasPrevious && previousEntryId !== null ? (
        <Button asChild variant="outline">
          <Link to="/journal/$entryId" params={{ entryId: String(previousEntryId) }}>
            Previous
          </Link>
        </Button>
      ) : (
        <Button type="button" variant="outline" disabled>
          Previous
        </Button>
      )}
      {hasNext && nextEntryId !== null ? (
        <Button asChild variant="outline">
          <Link to="/journal/$entryId" params={{ entryId: String(nextEntryId) }}>
            Next
          </Link>
        </Button>
      ) : (
        <Button type="button" variant="outline" disabled>
          Next
        </Button>
      )}
    </Stack>
  );
}
