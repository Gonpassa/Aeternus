import { createFileRoute, getRouteApi, Link } from '@tanstack/react-router';
import { useState } from 'react';
import { Box, Flex, Heading, Text } from '@chakra-ui/react';
import { useEntries, useEntriesByRange } from '../../modules/journal/api/journalHooks.ts';
import { MOOD_DOT_COLOR, MOOD_LABEL } from '../../modules/journal/moodColors.ts';
import { stripHtml } from '../../modules/journal/textUtils.ts';
import { requireAuth } from '../../auth/requireAuth.ts';
import { JournalCalendarFilter } from '../../modules/journal/components/JournalCalendarFilter/JournalCalendarFilter.tsx';
import type { DateRangeValue } from '../../components/MarkedRangeCalendar/MarkedRangeCalendar.tsx';
import { Button } from '../../components/ui/Button/Button.tsx';

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
    <Box mx="auto" maxW="2xl" p="4">
      <Flex mb="4" align="center" justify="space-between">
        <Heading as="h1" fontFamily="heading" fontSize="3xl" fontWeight="semibold" color="ink">
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
      </Flex>
      <Box mb="4">
        <JournalCalendarFilter
          selectedRange={selectedRange}
          onRangeChange={setSelectedRange}
          entryCount={hasFilter ? filtered.data?.length : undefined}
        />
      </Box>
      <Box as="ul" display="flex" flexDirection="column" gap="3">
        {entries.map((entry) => (
          <Box as="li" key={entry.id} borderWidth="1px" borderColor="line" bg="paperCard" p="4">
            <Box asChild display="block">
              <Link to="/journal/$entryId" params={{ entryId: String(entry.id) }}>
                <Flex
                  align="center"
                  gap="2"
                  fontFamily="mono"
                  fontSize="xs"
                  textTransform="uppercase"
                  color="inkSoft"
                >
                  <Box
                    boxSize="2"
                    borderRadius="full"
                    bg={MOOD_DOT_COLOR[entry.primaryMood]}
                    aria-hidden="true"
                  />
                  {entry.date} &middot; {MOOD_LABEL[entry.primaryMood]}
                </Flex>
                <Heading as="h2" fontFamily="heading" fontSize="lg" fontWeight="medium" color="ink">
                  {entry.title}
                </Heading>
                <Text fontFamily="body" color="inkSoft">
                  {stripHtml(entry.content).slice(0, 140)}
                </Text>
              </Link>
            </Box>
          </Box>
        ))}
      </Box>
      {dataLoaded && entries.length === 0 && <Text color="inkSoft">No entries yet.</Text>}
    </Box>
  );
}

export const Route = createFileRoute('/journal/')({
  component: JournalIndexPage,
  validateSearch: (search: Record<string, unknown>): JournalIndexSearch => ({
    page: typeof search.page === 'number' ? search.page : Number(search.page) || 1,
  }),
  beforeLoad: ({ context, location }) => requireAuth(context.queryClient)({ location }),
});
