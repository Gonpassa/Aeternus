/* eslint-disable react/jsx-props-no-spreading --
   MarkedRangeCalendar's DayButton override forwards react-day-picker's
   remaining day-button props (onBlur/onFocus/onKeyDown/onMouseEnter/
   onMouseLeave/tabIndex) via {...props}, mirroring the pattern used by
   shadcn/ui's own Calendar primitive (see ui/calendar.tsx). */
import { createContext, useContext, useMemo } from 'react';
import type { ComponentProps } from 'react';
import type { DayButton } from 'react-day-picker';
import { Calendar } from '../ui/calendar.tsx';

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

function MarkedDayButton({
  className: _className,
  day,
  modifiers: _modifiers,
  children,
  ...props
}: ComponentProps<typeof DayButton>) {
  const { markedDates, selectedRange, onRangeChange } = useContext(MarkedRangeContext);

  const iso = toIsoDate(day.date);
  const ringColor = markedDates.get(iso);
  const disabled = !ringColor;
  const inRange = !disabled && isInRange(day.date, selectedRange);
  const endpoint = !disabled && isEndpoint(day.date, selectedRange);

  return (
    <button
      {...props}
      type="button"
      aria-label={iso}
      disabled={disabled}
      onClick={() => {
        if (disabled) return;
        onRangeChange(computeNextRange(selectedRange, day.date));
      }}
      className={[
        'flex aspect-square size-full items-center justify-center font-mono text-xs',
        disabled ? 'cursor-default text-ink-soft opacity-30' : 'cursor-pointer text-ink',
        inRange && !endpoint ? 'bg-moss/[0.14]' : '',
        endpoint ? 'bg-moss text-paper' : '',
      ]
        .filter(Boolean)
        .join(' ')}
      style={ringColor && !endpoint ? { boxShadow: `inset 0 0 0 1.3px ${ringColor}` } : undefined}
    >
      {children ?? day.date.getDate()}
    </button>
  );
}

export function MarkedRangeCalendar({
  markedDates,
  visibleMonth,
  onVisibleMonthChange,
  selectedRange,
  onRangeChange,
}: MarkedRangeCalendarProps) {
  const isDisabled = (date: Date): boolean => !markedDates.has(toIsoDate(date));

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
        disabled={isDisabled}
        showOutsideDays={false}
        onDayClick={() => {}}
        classNames={{
          root: 'w-fit',
          months: 'flex gap-6',
          month: 'flex flex-col gap-2',
          nav: 'hidden',
          month_caption:
            'flex items-center justify-center px-2 py-1 font-mono text-xs uppercase text-ink-soft',
          month_grid: 'w-full border-collapse',
          weekdays: 'flex',
          weekday: 'flex-1 text-center font-mono text-[0.65rem] uppercase text-ink-soft',
          week: 'flex w-full',
          day: 'aspect-square w-9 p-0.5 text-center',
        }}
        components={{ DayButton: MarkedDayButton }}
      />
    </MarkedRangeContext.Provider>
  );
}
