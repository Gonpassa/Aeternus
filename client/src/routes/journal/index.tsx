import { createFileRoute, getRouteApi, Link } from '@tanstack/react-router';
import { useState } from 'react';
import { useEntries, useEntriesByRange } from '../../modules/journal/api/journalHooks.ts';
import { MOOD_DOT_COLOR, MOOD_LABEL } from '../../modules/journal/moodColors.ts';
import { stripHtml } from '../../modules/journal/textUtils.ts';
import { requireAuth } from '../../auth/requireAuth.ts';
import { JournalCalendarFilter } from '../../modules/journal/components/JournalCalendarFilter/JournalCalendarFilter.tsx';
import type { DateRangeValue } from '../../components/ui/MarkedRangeCalendar/MarkedRangeCalendar.tsx';
import { Button } from '../../components/ui/Button/Button.tsx';
import { PageContainer } from '../../components/ui/PageContainer/PageContainer.tsx';
import { Stack } from '../../components/ui/Stack/Stack.tsx';
import { Heading } from '../../components/ui/Heading/Heading.tsx';
import { Text } from '../../components/ui/Text/Text.tsx';
import { Card } from '../../components/ui/Card/Card.tsx';
import { Dot } from '../../components/ui/Dot/Dot.tsx';

export interface JournalIndexSearch {
  page: number;
}

const routeApi = getRouteApi('/journal/');

const toIsoDate = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

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
        <Button
          asChild
          bg="inkBlue"
          px="3"
          py="2"
          fontFamily="mono"
          fontSize="xs"
          textTransform="uppercase"
          color="paper"
        >
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
                <Stack
                  align="center"
                  gap="2"
                  fontFamily="mono"
                  fontSize="xs"
                  textTransform="uppercase"
                  color="inkSoft"
                >
                  <Dot size="2" color={MOOD_DOT_COLOR[entry.primaryMood]} />
                  {entry.date} &middot; {MOOD_LABEL[entry.primaryMood]}
                </Stack>
                <Heading as="h2" fontFamily="heading" fontSize="lg" fontWeight="medium" color="ink">
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
