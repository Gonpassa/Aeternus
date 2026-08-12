import { createFileRoute, getRouteApi, Link } from '@tanstack/react-router';
import { useState } from 'react';
import { useEntries, useEntriesByRange } from '../../modules/journal/api/journalHooks.ts';
import { MOOD_DOT_CLASS, MOOD_LABEL } from '../../modules/journal/moodColors.ts';
import { stripHtml } from '../../modules/journal/textUtils.ts';
import { requireAuth } from '../../auth/requireAuth.ts';
import { JournalCalendarFilter } from '../../modules/journal/components/JournalCalendarFilter/JournalCalendarFilter.tsx';
import type { DateRangeValue } from '../../components/MarkedRangeCalendar/MarkedRangeCalendar.tsx';

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
    <div className="mx-auto max-w-2xl p-4">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="font-display text-3xl font-semibold text-ink">Journal</h1>
        <Link
          to="/journal/new"
          className="bg-ink-blue px-3 py-2 font-mono text-xs uppercase text-paper"
        >
          New entry
        </Link>
      </div>
      <div className="mb-4">
        <JournalCalendarFilter selectedRange={selectedRange} onRangeChange={setSelectedRange} />
      </div>
      <ul className="flex flex-col gap-3">
        {entries.map((entry) => (
          <li key={entry.id} className="border border-line bg-paper-card p-4">
            <Link to="/journal/$entryId" params={{ entryId: String(entry.id) }} className="block">
              <div className="flex items-center gap-2 font-mono text-xs uppercase text-ink-soft">
                <span
                  className={`h-2 w-2 rounded-full ${MOOD_DOT_CLASS[entry.primaryMood]}`}
                  aria-hidden="true"
                />
                {entry.date} &middot; {MOOD_LABEL[entry.primaryMood]}
              </div>
              <h2 className="font-display text-lg font-medium text-ink">{entry.title}</h2>
              <p className="font-body text-ink-soft">{stripHtml(entry.content).slice(0, 140)}</p>
            </Link>
          </li>
        ))}
      </ul>
      {dataLoaded && entries.length === 0 && <p className="text-ink-soft">No entries yet.</p>}
    </div>
  );
}

export const Route = createFileRoute('/journal/')({
  component: JournalIndexPage,
  validateSearch: (search: Record<string, unknown>): JournalIndexSearch => ({
    page: typeof search.page === 'number' ? search.page : Number(search.page) || 1,
  }),
  beforeLoad: ({ context, location }) => requireAuth(context.queryClient)({ location }),
});
