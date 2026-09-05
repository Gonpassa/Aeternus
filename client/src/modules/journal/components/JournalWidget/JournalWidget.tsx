import { Link } from '@tanstack/react-router';
import type { JournalSummaryResponse, PrimaryMood } from '@nee3/shared-types';
import { useJournalSummary } from '../../api/journalHooks.ts';
import { toIsoDate } from '../../dateUtils.ts';
import { MOOD_DOT_COLOR, MOOD_LABEL } from '../../moodColors.ts';
import { IndexCard } from '../../../../atoms/IndexCard/IndexCard.tsx';
import { LoadingGate } from '../../../../atoms/LoadingGate/LoadingGate.tsx';
import { Stack } from '../../../../atoms/Stack/Stack.tsx';
import { Text } from '../../../../atoms/Text/Text.tsx';
import { Button } from '../../../../atoms/Button/Button.tsx';
import { Dot } from '../../../../atoms/Dot/Dot.tsx';

function QuickEntryLink() {
  return (
    <Stack asChild textStyle="button" color="moss">
      <Link to="/journal/new">+ New entry</Link>
    </Stack>
  );
}

function EmptyState() {
  return (
    <Stack direction="column" gap="3" align="flex-start">
      <Text fontFamily="body" color="ink">
        You haven&rsquo;t written anything yet - your first page is waiting.
      </Text>
      <Button asChild>
        <Link to="/journal/new">Start your first entry</Link>
      </Button>
    </Stack>
  );
}

function PopulatedState({ summary }: { summary: JournalSummaryResponse }) {
  const activeMoods = (Object.keys(summary.moodSnapshot) as PrimaryMood[]).filter(
    (mood) => summary.moodSnapshot[mood] > 0,
  );

  return (
    <Stack direction="column" gap="4" w="full">
      <Stack as="ul" direction="column" gap="2">
        {summary.recentEntries.map((entry) => (
          <Stack
            as="li"
            key={entry.id}
            asChild
            align="center"
            gap="2"
            textStyle="label"
            color="inkSoft"
          >
            <Link to="/journal/$entryId" params={{ entryId: String(entry.id) }}>
              <Dot size="2" color={MOOD_DOT_COLOR[entry.primaryMood]} />
              {entry.date}
              <Text as="span" color="ink" textTransform="none" fontFamily="body">
                {entry.title}
              </Text>
            </Link>
          </Stack>
        ))}
      </Stack>

      <Stack gap="1" textStyle="label" color="inkSoft">
        <Text as="span" color="ink" fontWeight="medium">
          {summary.streak.current}
        </Text>
        day streak
      </Stack>

      <Stack gap="3" wrap="wrap">
        {activeMoods.map((mood) => (
          <Stack key={mood} align="center" gap="1.5" textStyle="label" color="inkSoft">
            <Dot size="2" color={MOOD_DOT_COLOR[mood]} />
            {MOOD_LABEL[mood]} &middot; {summary.moodSnapshot[mood]}
          </Stack>
        ))}
      </Stack>
    </Stack>
  );
}

export function JournalWidget() {
  const asOf = toIsoDate(new Date());
  const summary = useJournalSummary(asOf);

  return (
    <IndexCard label="Journal" catalogNumber="No. 001">
      <Stack direction="column" gap="4" align="flex-start">
        <QuickEntryLink />
        {summary.isPending && <LoadingGate w="full" minH="120px" size="sm" />}
        {summary.data && summary.data.recentEntries.length === 0 && <EmptyState />}
        {summary.data && summary.data.recentEntries.length > 0 && (
          <PopulatedState summary={summary.data} />
        )}
      </Stack>
    </IndexCard>
  );
}
