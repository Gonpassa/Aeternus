/* eslint-disable react/jsx-props-no-spreading --
   MarkedRangeCalendar's DayButton override forwards react-day-picker's
   remaining day-button props (onBlur/onFocus/onKeyDown/onMouseEnter/
   onMouseLeave/tabIndex) via {...props}, mirroring the pattern used by
   shadcn/ui's own Calendar primitive (see ui/Calendar/Calendar.tsx). */
import { createContext, useContext, useEffect, useMemo, useRef } from 'react';
import type { ComponentProps } from 'react';
import type { DayButton } from 'react-day-picker';
import { Box, chakra } from '@chakra-ui/react';
import { Calendar } from '../ui/Calendar/Calendar.tsx';
import styles from './MarkedRangeCalendar.module.css';

export interface DateRangeValue {
  from?: Date;
  to?: Date;
}

export interface MarkedRangeCalendarProps {
  markedDates: Map<string, string>;
  visibleMonth: Date;
  onVisibleMonthChange: (month: Date) => void;
  selectedRange: DateRangeValue;
  onRangeChange: (range: DateRangeValue) => void;
}

export const toIsoDate = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const isSameDay = (a: Date, b: Date): boolean => toIsoDate(a) === toIsoDate(b);

export const computeNextRange = (current: DateRangeValue, clicked: Date): DateRangeValue => {
  if (!current.from) {
    return { from: clicked, to: clicked };
  }
  const isSingleDaySelection = !current.to || isSameDay(current.from, current.to);
  if (!isSingleDaySelection) {
    return { from: clicked, to: clicked };
  }
  if (clicked.getTime() < current.from.getTime()) {
    return { from: clicked, to: clicked };
  }
  return { from: current.from, to: clicked };
};

const isInRange = (date: Date, range: DateRangeValue): boolean => {
  if (!range.from || !range.to) return false;
  return date.getTime() >= range.from.getTime() && date.getTime() <= range.to.getTime();
};

const isEndpoint = (date: Date, range: DateRangeValue): boolean =>
  Boolean((range.from && isSameDay(date, range.from)) || (range.to && isSameDay(date, range.to)));

interface MarkedRangeContextValue {
  markedDates: Map<string, string>;
  selectedRange: DateRangeValue;
  onRangeChange: (range: DateRangeValue) => void;
}

const defaultContextValue: MarkedRangeContextValue = {
  markedDates: new Map(),
  selectedRange: {},
  onRangeChange: () => {},
};

const MarkedRangeContext = createContext<MarkedRangeContextValue>(defaultContextValue);

const DayCellButton = chakra('button');

function MarkedDayButton({
  className: _className,
  day,
  modifiers,
  children,
  ...props
}: ComponentProps<typeof DayButton>) {
  const { markedDates, selectedRange, onRangeChange } = useContext(MarkedRangeContext);
  const ref = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (modifiers.focused) ref.current?.focus();
  }, [modifiers.focused]);

  const iso = toIsoDate(day.date);
  const moodColor = markedDates.get(iso);
  const inRange = isInRange(day.date, selectedRange);
  const endpoint = isEndpoint(day.date, selectedRange);
  const textColor = endpoint ? 'paper' : 'ink';

  let bgColor: string | undefined;
  if (endpoint) bgColor = 'moss';
  else if (inRange) bgColor = 'moss/14';

  const marked = Boolean(moodColor) && !endpoint;

  return (
    <DayCellButton
      {...props}
      ref={ref}
      type="button"
      data-iso={iso}
      onClick={() => onRangeChange(computeNextRange(selectedRange, day.date))}
      display="flex"
      position="relative"
      aspectRatio="1"
      boxSize="full"
      alignItems="center"
      justifyContent="center"
      borderRadius="md"
      fontFamily="mono"
      fontSize="xs"
      fontWeight={marked ? 'semibold' : 'normal'}
      cursor="pointer"
      color={textColor}
      bg={bgColor}
      style={
        marked
          ? {
              backgroundColor: `${moodColor}29`,
            }
          : undefined
      }
    >
      {children ?? day.date.getDate()}
      {marked && (
        <Box
          position="absolute"
          left="50%"
          bottom="3px"
          transform="translateX(-50%)"
          boxSize="4px"
          borderRadius="full"
          bg={moodColor}
          aria-hidden="true"
        />
      )}
    </DayCellButton>
  );
}

export function MarkedRangeCalendar({
  markedDates,
  visibleMonth,
  onVisibleMonthChange,
  selectedRange,
  onRangeChange,
}: MarkedRangeCalendarProps) {
  const contextValue = useMemo<MarkedRangeContextValue>(
    () => ({ markedDates, selectedRange, onRangeChange }),
    [markedDates, selectedRange, onRangeChange],
  );

  return (
    <MarkedRangeContext.Provider value={contextValue}>
      <Calendar
        numberOfMonths={2}
        month={visibleMonth}
        onMonthChange={onVisibleMonthChange}
        showOutsideDays={false}
        onDayClick={() => {}}
        formatters={{
          formatWeekdayName: (date: Date) =>
            date.toLocaleDateString('en-US', { weekday: 'narrow' }),
        }}
        classNames={{
          root: styles.root,
          months: styles.months,
          month: styles.month,
          nav: styles.navHidden,
          month_caption: styles.monthCaption,
          month_grid: styles.monthGrid,
          weekdays: styles.weekdays,
          weekday: styles.weekday,
          week: styles.week,
          day: styles.day,
        }}
        components={{ DayButton: MarkedDayButton }}
      />
    </MarkedRangeContext.Provider>
  );
}
