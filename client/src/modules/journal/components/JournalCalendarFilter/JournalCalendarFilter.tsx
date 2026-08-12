import { useMemo, useState } from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../../../components/ui/select.tsx';
import {
  MarkedRangeCalendar,
  type DateRangeValue,
} from '../../../../components/MarkedRangeCalendar/MarkedRangeCalendar.tsx';
import { useEntriesByRange } from '../../api/journalHooks.ts';
import { MOOD_RING_COLOR } from '../../moodColors.ts';

export interface JournalCalendarFilterProps {
  selectedRange: DateRangeValue;
  onRangeChange: (range: DateRangeValue) => void;
}

const MONTH_LABELS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

const toIsoDate = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const startOfMonth = (date: Date): Date => new Date(date.getFullYear(), date.getMonth(), 1);
const addMonths = (date: Date, count: number): Date =>
  new Date(date.getFullYear(), date.getMonth() + count, 1);
const endOfMonth = (date: Date): Date => new Date(date.getFullYear(), date.getMonth() + 1, 0);

export function formatRangeLabel(range: DateRangeValue): string {
  if (!range.from) return '';
  const { from, to } = range;
  if (!to || toIsoDate(from) === toIsoDate(to)) {
    return `Showing entries ${toIsoDate(from)}`;
  }
  return `Showing entries ${toIsoDate(from)} – ${toIsoDate(to)}`;
}

export function JournalCalendarFilter({
  selectedRange,
  onRangeChange,
}: JournalCalendarFilterProps) {
  const [visibleMonth, setVisibleMonth] = useState<Date>(() => startOfMonth(new Date()));

  const rangeStart = toIsoDate(startOfMonth(visibleMonth));
  const rangeEnd = toIsoDate(endOfMonth(addMonths(visibleMonth, 1)));
  const { data } = useEntriesByRange({ start: rangeStart, end: rangeEnd });

  const markedDates = useMemo(() => {
    const map = new Map<string, string>();
    (data ?? []).forEach((entry) => {
      map.set(entry.date, MOOD_RING_COLOR[entry.primaryMood]);
    });
    return map;
  }, [data]);

  const years = useMemo(() => {
    const current = new Date().getFullYear();
    return Array.from({ length: 11 }, (_, i) => current - 5 + i);
  }, []);

  const hasFilter = Boolean(selectedRange.from);

  return (
    <div className="border border-line bg-paper-card p-4">
      <div className="mb-3 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <button
            type="button"
            aria-label="Previous month"
            onClick={() => setVisibleMonth(addMonths(visibleMonth, -1))}
            className="border border-ink-blue bg-transparent px-2 py-1 font-mono text-xs text-ink-blue"
          >
            &lsaquo;
          </button>
          <Select
            value={String(visibleMonth.getMonth())}
            onValueChange={(value) =>
              setVisibleMonth(new Date(visibleMonth.getFullYear(), Number(value), 1))
            }
          >
            <SelectTrigger className="rounded-none border-line font-mono text-xs uppercase">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {MONTH_LABELS.map((label, index) => (
                <SelectItem key={label} value={String(index)}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={String(visibleMonth.getFullYear())}
            onValueChange={(value) =>
              setVisibleMonth(new Date(Number(value), visibleMonth.getMonth(), 1))
            }
          >
            <SelectTrigger className="rounded-none border-line font-mono text-xs uppercase">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {years.map((year) => (
                <SelectItem key={year} value={String(year)}>
                  {year}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <button
            type="button"
            aria-label="Next month"
            onClick={() => setVisibleMonth(addMonths(visibleMonth, 1))}
            className="border border-ink-blue bg-transparent px-2 py-1 font-mono text-xs text-ink-blue"
          >
            &rsaquo;
          </button>
        </div>
        {hasFilter && (
          <button
            type="button"
            onClick={() => onRangeChange({})}
            className="font-mono text-xs uppercase text-moss underline"
          >
            Clear filter
          </button>
        )}
      </div>
      <MarkedRangeCalendar
        markedDates={markedDates}
        visibleMonth={visibleMonth}
        onVisibleMonthChange={setVisibleMonth}
        selectedRange={selectedRange}
        onRangeChange={onRangeChange}
      />
      {hasFilter && (
        <p className="mt-3 font-mono text-xs uppercase text-ink-soft">
          {formatRangeLabel(selectedRange)}
          {data ? ` · ${data.length} entries` : ''}
        </p>
      )}
    </div>
  );
}
