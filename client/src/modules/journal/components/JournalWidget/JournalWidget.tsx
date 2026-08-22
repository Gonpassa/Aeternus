import { Link } from '@tanstack/react-router';
import { useEntries } from '../../api/journalHooks.ts';
import { IndexCard } from '../../../../atoms/IndexCard/IndexCard.tsx';
import { Stack } from '../../../../atoms/Stack/Stack.tsx';
import { Text } from '../../../../atoms/Text/Text.tsx';
import { Button } from '../../../../atoms/Button/Button.tsx';

export function JournalWidget() {
  const paginated = useEntries(1);
  const isEmpty = paginated.data?.total === 0;

  return (
    <IndexCard title="Journal" label="Journal" catalogNumber="No. 001">
      <Stack direction="column" gap="4" align="flex-start">
        <Stack
          asChild
          fontFamily="mono"
          fontSize="xs"
          textTransform="uppercase"
          letterSpacing="0.04em"
          color="moss"
        >
          <Link to="/journal/new">+ New entry</Link>
        </Stack>
        {isEmpty && (
          <Stack direction="column" gap="3" align="flex-start">
            <Text fontFamily="body" color="ink">
              You haven&rsquo;t written anything yet - your first page is waiting.
            </Text>
            <Button asChild>
              <Link to="/journal/new">Start your first entry</Link>
            </Button>
          </Stack>
        )}
      </Stack>
    </IndexCard>
  );
}
