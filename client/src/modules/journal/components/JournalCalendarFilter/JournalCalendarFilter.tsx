import { useMemo, useState } from 'react';
import { Box, Flex, Text } from '@chakra-ui/react';
import { ChevronLeftIcon, ChevronRightIcon } from 'lucide-react';
import { Button } from '../../../../components/ui/Button/Button.tsx';
import {
  createListCollection,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../../../components/ui/Select/Select.tsx';
import {
  MarkedRangeCalendar,
  type DateRangeValue,
} from '../../../../components/MarkedRangeCalendar/MarkedRangeCalendar.tsx';
import { useEntriesByRange } from '../../api/journalHooks.ts';
import { MOOD_RING_COLOR } from '../../moodColors.ts';

export interface JournalCalendarFilterProps {
  selectedRange: DateRangeValue;
  onRangeChange: (range: DateRangeValue) => void;
  entryCount?: number;
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

const MONTH_ABBR = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
];

const toIsoDate = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const formatShortDate = (date: Date): string => `${MONTH_ABBR[date.getMonth()]} ${date.getDate()}`;

const startOfMonth = (date: Date): Date => new Date(date.getFullYear(), date.getMonth(), 1);
const addMonths = (date: Date, count: number): Date =>
  new Date(date.getFullYear(), date.getMonth() + count, 1);
const endOfMonth = (date: Date): Date => new Date(date.getFullYear(), date.getMonth() + 1, 0);

export function formatRangeLabel(range: DateRangeValue): string {
  if (!range.from) return '';
  const { from, to } = range;
  if (!to || toIsoDate(from) === toIsoDate(to)) {
    return `Showing entries ${formatShortDate(from)}, ${from.getFullYear()}`;
  }
  return `Showing entries ${formatShortDate(from)} – ${formatShortDate(to)}, ${to.getFullYear()}`;
}

export function JournalCalendarFilter({
  selectedRange,
  onRangeChange,
  entryCount,
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

  const monthCollection = useMemo(
    () =>
      createListCollection({
        items: MONTH_LABELS.map((label, index) => ({ value: String(index), label })),
      }),
    [],
  );
  const yearCollection = useMemo(
    () =>
      createListCollection({
        items: years.map((year) => ({ value: String(year), label: String(year) })),
      }),
    [years],
  );

  const hasFilter = Boolean(selectedRange.from);

  return (
    <Box borderWidth="1px" borderColor="line" bg="paperCard" p="4">
      <Flex mb="3" align="center" justify="space-between" gap="2">
        <Flex align="center" gap="2">
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            aria-label="Previous month"
            onClick={() => setVisibleMonth(addMonths(visibleMonth, -1))}
            borderRadius="full"
            _hover={{ bg: 'moss/14', textDecoration: 'none' }}
          >
            <ChevronLeftIcon size={16} />
          </Button>
          <Select
            collection={monthCollection}
            value={[String(visibleMonth.getMonth())]}
            onValueChange={(details) =>
              setVisibleMonth(new Date(visibleMonth.getFullYear(), Number(details.value[0]), 1))
            }
          >
            <SelectTrigger borderRadius="0">
              <SelectValue />
            </SelectTrigger>
            <SelectContent borderRadius="0" boxShadow="none">
              {monthCollection.items.map((item) => (
                <SelectItem key={item.value} item={item}>
                  {item.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            collection={yearCollection}
            value={[String(visibleMonth.getFullYear())]}
            onValueChange={(details) =>
              setVisibleMonth(new Date(Number(details.value[0]), visibleMonth.getMonth(), 1))
            }
          >
            <SelectTrigger borderRadius="0">
              <SelectValue />
            </SelectTrigger>
            <SelectContent borderRadius="0" boxShadow="none">
              {yearCollection.items.map((item) => (
                <SelectItem key={item.value} item={item}>
                  {item.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            aria-label="Next month"
            onClick={() => setVisibleMonth(addMonths(visibleMonth, 1))}
            borderRadius="full"
            _hover={{ bg: 'moss/14', textDecoration: 'none' }}
          >
            <ChevronRightIcon size={16} />
          </Button>
        </Flex>
        {hasFilter && (
          <Button type="button" variant="link" onClick={() => onRangeChange({})}>
            Clear filter
          </Button>
        )}
      </Flex>
      <MarkedRangeCalendar
        markedDates={markedDates}
        visibleMonth={visibleMonth}
        onVisibleMonthChange={setVisibleMonth}
        selectedRange={selectedRange}
        onRangeChange={onRangeChange}
      />
      {hasFilter && (
        <Text mt="3" fontFamily="mono" fontSize="xs" textTransform="uppercase" color="inkSoft">
          {formatRangeLabel(selectedRange)}
          {entryCount !== undefined ? ` · ${entryCount} entries` : ''}
        </Text>
      )}
    </Box>
  );
}
