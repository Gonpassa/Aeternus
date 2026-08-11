import { createFileRoute, getRouteApi, Link } from '@tanstack/react-router';
import { useEntries } from '../../modules/journal/api/journalHooks.ts';
import { MOOD_DOT_CLASS, MOOD_LABEL } from '../../modules/journal/moodColors.ts';
import { stripHtml } from '../../modules/journal/textUtils.ts';
import { requireAuth } from '../../auth/requireAuth.ts';

export interface JournalIndexSearch {
  page: number;
}

const routeApi = getRouteApi('/journal/');

function JournalIndexPage() {
  const { page } = routeApi.useSearch();
  const { data } = useEntries(page);

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
      <ul className="flex flex-col gap-3">
        {data?.entries.map((entry) => (
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
      {data && data.entries.length === 0 && <p className="text-ink-soft">No entries yet.</p>}
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
