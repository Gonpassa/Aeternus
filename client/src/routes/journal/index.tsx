import { createFileRoute, Link } from '@tanstack/react-router';
import { useState } from 'react';
import { useEntries, useEntriesByRange } from '../../modules/journal/api/journalHooks.ts';
import { toIsoDate } from '../../modules/journal/dateUtils.ts';
import { requireAuth } from '../../auth/requireAuth.ts';
import { JournalCalendarFilter } from '../../modules/journal/components/JournalCalendarFilter/JournalCalendarFilter.tsx';
import { EntryTimeline } from '../../modules/journal/components/EntryTimeline/EntryTimeline.tsx';
import type { DateRangeValue } from '../../atoms/MarkedRangeCalendar/MarkedRangeCalendar.tsx';
import { Button } from '../../atoms/Button/Button.tsx';
import { LoadingGate } from '../../atoms/LoadingGate/LoadingGate.tsx';
import { PageContainer } from '../../atoms/PageContainer/PageContainer.tsx';
import { Stack } from '../../atoms/Stack/Stack.tsx';
import { Heading } from '../../atoms/Heading/Heading.tsx';
import { Text } from '../../atoms/Text/Text.tsx';

function JournalIndexPage() {
  const [selectedRange, setSelectedRange] = useState<DateRangeValue>({});
  const hasFilter = Boolean(selectedRange.from);

  const all = useEntries();
  const filtered = useEntriesByRange({
    start: selectedRange.from ? toIsoDate(selectedRange.from) : '',
    end: selectedRange.to ? toIsoDate(selectedRange.to) : '',
  });

  const activeQuery = hasFilter ? filtered : all;
  const entries = activeQuery.data ?? [];

  return (
    <PageContainer maxW="4xl" centered>
      <Stack mb="4" align="center" justify="space-between">
        <Heading as="h1" variant="page">
          Journal
        </Heading>
        <Button asChild bg="inkBlue" px="3" py="2" color="paper">
          <Link to="/journal/new">New entry</Link>
        </Button>
      </Stack>
      <Stack direction="column" mb="4">
        <JournalCalendarFilter
          selectedRange={selectedRange}
          onRangeChange={setSelectedRange}
          entryCount={hasFilter ? filtered.data?.length : undefined}
        />
      </Stack>

      {activeQuery.isPending && <LoadingGate minH="30vh" />}
      {!activeQuery.isPending && entries.length === 0 && (
        <Text variant="muted">No entries yet.</Text>
      )}
      {!activeQuery.isPending && entries.length > 0 && <EntryTimeline entries={entries} />}
    </PageContainer>
  );
}

export const Route = createFileRoute('/journal/')({
  component: JournalIndexPage,
  beforeLoad: ({ context, location }) => requireAuth(context.queryClient)({ location }),
});
