import { createFileRoute, Link, getRouteApi, useNavigate } from '@tanstack/react-router';
import { useState } from 'react';
import { useEntries, useEntriesByRange } from '../../modules/journal/api/journalHooks.ts';
import { toIsoDate } from '../../modules/journal/dateUtils.ts';
import { requireAuth } from '../../auth/requireAuth.ts';
import { JournalCalendarFilter } from '../../modules/journal/components/JournalCalendarFilter/JournalCalendarFilter.tsx';
import { VariantRuledTimeline } from '../../modules/journal/prototypeEntryDisplay/VariantRuledTimeline.tsx';
import { VariantCatalogGrid } from '../../modules/journal/prototypeEntryDisplay/VariantCatalogGrid.tsx';
import { VariantReadingPane } from '../../modules/journal/prototypeEntryDisplay/VariantReadingPane.tsx';
import { PrototypeSwitcher } from '../../modules/journal/prototypeEntryDisplay/PrototypeSwitcher.tsx';
import type { DateRangeValue } from '../../atoms/MarkedRangeCalendar/MarkedRangeCalendar.tsx';
import { Button } from '../../atoms/Button/Button.tsx';
import { PageContainer } from '../../atoms/PageContainer/PageContainer.tsx';
import { Stack } from '../../atoms/Stack/Stack.tsx';
import { Heading } from '../../atoms/Heading/Heading.tsx';
import { Text } from '../../atoms/Text/Text.tsx';

// PROTOTYPE - three display variants for the entry list below, switchable via
// ?variant=A|B|C, answering "what should entry display look like?" (not a list).
// See client/src/modules/journal/prototypeEntryDisplay/ for the variant components.
const PROTOTYPE_VARIANTS = [
  { key: 'A', name: 'Ruled timeline' },
  { key: 'B', name: 'Catalog grid' },
  { key: 'C', name: 'Reading pane' },
];

type PrototypeVariantKey = 'A' | 'B' | 'C';

export interface JournalIndexSearch {
  variant?: PrototypeVariantKey;
}

const routeApi = getRouteApi('/journal/');

function JournalIndexPage() {
  const [selectedRange, setSelectedRange] = useState<DateRangeValue>({});
  const hasFilter = Boolean(selectedRange.from);
  const { variant = 'A' } = routeApi.useSearch();
  const navigate = useNavigate();

  const all = useEntries();
  const filtered = useEntriesByRange({
    start: selectedRange.from ? toIsoDate(selectedRange.from) : '',
    end: selectedRange.to ? toIsoDate(selectedRange.to) : '',
  });

  const entries = hasFilter ? (filtered.data ?? []) : (all.data ?? []);
  const dataLoaded = hasFilter ? filtered.data !== undefined : all.data !== undefined;

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

      {dataLoaded && entries.length === 0 && <Text variant="muted">No entries yet.</Text>}
      {dataLoaded && entries.length > 0 && (
        <>
          {variant === 'A' && <VariantRuledTimeline entries={entries} />}
          {variant === 'B' && <VariantCatalogGrid entries={entries} />}
          {variant === 'C' && <VariantReadingPane entries={entries} />}
        </>
      )}

      {!import.meta.env.PROD && (
        <PrototypeSwitcher
          variants={PROTOTYPE_VARIANTS}
          current={variant}
          onChange={(key) =>
            navigate({
              to: '/journal',
              search: { variant: key as PrototypeVariantKey },
            })
          }
        />
      )}
    </PageContainer>
  );
}

export const Route = createFileRoute('/journal/')({
  component: JournalIndexPage,
  validateSearch: (search: Record<string, unknown>): JournalIndexSearch => ({
    variant: search.variant === 'B' || search.variant === 'C' ? search.variant : ('A' as const),
  }),
  beforeLoad: ({ context, location }) => requireAuth(context.queryClient)({ location }),
});
