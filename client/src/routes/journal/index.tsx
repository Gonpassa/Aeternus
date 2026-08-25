import { createFileRoute, getRouteApi, Link } from '@tanstack/react-router';
import { useState } from 'react';
import { useEntries, useEntriesByRange } from '../../modules/journal/api/journalHooks.ts';
import { MOOD_DOT_COLOR, MOOD_LABEL } from '../../modules/journal/moodColors.ts';
import { stripHtml } from '../../modules/journal/textUtils.ts';
import { toIsoDate } from '../../modules/journal/dateUtils.ts';
import { requireAuth } from '../../auth/requireAuth.ts';
import { JournalCalendarFilter } from '../../modules/journal/components/JournalCalendarFilter/JournalCalendarFilter.tsx';
import type { DateRangeValue } from '../../atoms/MarkedRangeCalendar/MarkedRangeCalendar.tsx';
import { Button } from '../../atoms/Button/Button.tsx';
import { PageContainer } from '../../atoms/PageContainer/PageContainer.tsx';
import { Stack } from '../../atoms/Stack/Stack.tsx';
import { Heading } from '../../atoms/Heading/Heading.tsx';
import { Text } from '../../atoms/Text/Text.tsx';
import { Card } from '../../atoms/Card/Card.tsx';
import { Dot } from '../../atoms/Dot/Dot.tsx';

export interface JournalIndexSearch {
  page: number;
}

const routeApi = getRouteApi('/journal/');

function JournalIndexPage() {
  const { page } = routeApi.useSearch();
  const [selectedRange, setSelectedRange] = useState<DateRangeValue>({});
  const hasFilter = Boolean(selectedRange.from);

  const paginated = useEntries(page);
  const filtered = useEntriesByRange({
    start: selectedRange.from ? toIsoDate(selectedRange.from) : '',
    end: selectedRange.to ? toIsoDate(selectedRange.to) : '',
  });

  const entries = hasFilter ? (filtered.data ?? []) : (paginated.data?.entries ?? []);
  const dataLoaded = hasFilter ? filtered.data !== undefined : paginated.data !== undefined;

  return (
    <PageContainer>
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
      <Stack as="ul" direction="column" gap="3">
        {entries.map((entry) => (
          <Card as="li" key={entry.id}>
            <Stack asChild direction="column">
              <Link to="/journal/$entryId" params={{ entryId: String(entry.id) }}>
                <Stack align="center" gap="2" textStyle="label" color="inkSoft">
                  <Dot size="2" color={MOOD_DOT_COLOR[entry.primaryMood]} />
                  {entry.date} &middot; {MOOD_LABEL[entry.primaryMood]}
                </Stack>
                <Heading as="h2" variant="card">
                  {entry.title}
                </Heading>
                <Text fontFamily="body" color="ink">
                  {stripHtml(entry.content).slice(0, 140)}
                </Text>
              </Link>
            </Stack>
          </Card>
        ))}
      </Stack>
      {dataLoaded && entries.length === 0 && <Text variant="muted">No entries yet.</Text>}
    </PageContainer>
  );
}

export const Route = createFileRoute('/journal/')({
  component: JournalIndexPage,
  validateSearch: (search: Record<string, unknown>): JournalIndexSearch => ({
    page: typeof search.page === 'number' ? search.page : Number(search.page) || 1,
  }),
  beforeLoad: ({ context, location }) => requireAuth(context.queryClient)({ location }),
});
