'use client';

/* eslint-disable react/jsx-props-no-spreading,
   react/no-unstable-nested-components, react/prop-types,
   @typescript-eslint/no-shadow, no-use-before-define --
   the Calendar primitive forwards remaining DayPicker props via `{...props}`,
   defines DayPicker's `components` overrides inline (the library's own
   customization pattern, hence the locally-shadowed prop names), and
   references CalendarDayButton before its declaration further down the
   file. */
import * as React from 'react';
import { Box } from '@chakra-ui/react';
import { ChevronDownIcon, ChevronLeftIcon, ChevronRightIcon } from 'lucide-react';
import { DayPicker, getDefaultClassNames, type DayButton } from 'react-day-picker';

import { Button, type ButtonProps } from '@/components/ui/button';
import styles from './calendar.module.css';

function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  captionLayout = 'label',
  // Kept for external API compatibility (button_previous/button_next no
  // longer route through a `buttonVariants`-style helper, since nav buttons
  // are styled via calendar.module.css instead).
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  buttonVariant = 'ghost',
  formatters,
  components,
  ...props
}: React.ComponentProps<typeof DayPicker> & {
  buttonVariant?: ButtonProps['variant'];
}) {
  const defaultClassNames = getDefaultClassNames();

  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      className={[styles.root, className].filter(Boolean).join(' ')}
      captionLayout={captionLayout}
      formatters={{
        formatMonthDropdown: (date) => date.toLocaleString('default', { month: 'short' }),
        ...formatters,
      }}
      classNames={{
        root: [styles.root, defaultClassNames.root].join(' '),
        months: [styles.months, defaultClassNames.months].join(' '),
        month: [styles.month, defaultClassNames.month].join(' '),
        nav: [styles.nav, defaultClassNames.nav].join(' '),
        button_previous: [styles.navButton, defaultClassNames.button_previous].join(' '),
        button_next: [styles.navButton, defaultClassNames.button_next].join(' '),
        month_caption: [styles.monthCaption, defaultClassNames.month_caption].join(' '),
        dropdowns: [styles.dropdowns, defaultClassNames.dropdowns].join(' '),
        dropdown_root: [styles.dropdownRoot, defaultClassNames.dropdown_root].join(' '),
        dropdown: [styles.dropdown, defaultClassNames.dropdown].join(' '),
        caption_label: [styles.captionLabel, defaultClassNames.caption_label].join(' '),
        month_grid: [styles.monthGrid, defaultClassNames.month_grid].join(' '),
        weekdays: [styles.weekdays, defaultClassNames.weekdays].join(' '),
        weekday: [styles.weekday, defaultClassNames.weekday].join(' '),
        week: [styles.week, defaultClassNames.week].join(' '),
        week_number_header: [styles.weekNumberHeader, defaultClassNames.week_number_header].join(
          ' ',
        ),
        week_number: [styles.weekNumber, defaultClassNames.week_number].join(' '),
        day: [styles.day, defaultClassNames.day].join(' '),
        range_start: [styles.rangeStart, defaultClassNames.range_start].join(' '),
        range_middle: [styles.rangeMiddle, defaultClassNames.range_middle].join(' '),
        range_end: [styles.rangeEnd, defaultClassNames.range_end].join(' '),
        today: [styles.today, defaultClassNames.today].join(' '),
        outside: [styles.outside, defaultClassNames.outside].join(' '),
        disabled: [styles.disabled, defaultClassNames.disabled].join(' '),
        hidden: [styles.hidden, defaultClassNames.hidden].join(' '),
        ...classNames,
      }}
      components={{
        Root: ({ className: rootClassName, rootRef, ...rootProps }) => (
          <div data-slot="calendar" ref={rootRef} className={rootClassName} {...rootProps} />
        ),
        Chevron: ({ className: chevronClassName, orientation, ...chevronProps }) => {
          if (orientation === 'left') {
            return <ChevronLeftIcon className={chevronClassName} {...chevronProps} />;
          }
          if (orientation === 'right') {
            return <ChevronRightIcon className={chevronClassName} {...chevronProps} />;
          }
          return <ChevronDownIcon className={chevronClassName} {...chevronProps} />;
        },
        DayButton: CalendarDayButton,
        WeekNumber: ({ children, ...weekNumberProps }) => (
          <td {...weekNumberProps}>
            <Box
              display="flex"
              alignItems="center"
              justifyContent="center"
              className={styles.weekNumberCell}
            >
              {children}
            </Box>
          </td>
        ),
        ...components,
      }}
      {...props}
    />
  );
}

function CalendarDayButton({
  className,
  day,
  modifiers,
  ...props
}: React.ComponentProps<typeof DayButton>) {
  const ref = React.useRef<HTMLButtonElement>(null);
  React.useEffect(() => {
    if (modifiers.focused) ref.current?.focus();
  }, [modifiers.focused]);

  return (
    <Button
      ref={ref}
      variant="ghost"
      size="icon"
      data-day={day.date.toLocaleDateString()}
      data-selected-single={
        modifiers.selected &&
        !modifiers.range_start &&
        !modifiers.range_end &&
        !modifiers.range_middle
      }
      data-range-start={modifiers.range_start}
      data-range-end={modifiers.range_end}
      data-range-middle={modifiers.range_middle}
      className={[styles.dayButton, className].filter(Boolean).join(' ')}
      fontWeight="normal"
      color="ink"
      css={{
        '&[data-range-start=true], &[data-range-end=true], &[data-selected-single=true]': {
          bg: 'primary',
          color: 'primaryForeground',
        },
        '&[data-range-middle=true]': {
          bg: 'accent',
          color: 'accentForeground',
          borderRadius: '0',
        },
      }}
      {...props}
    />
  );
}

export { Calendar, CalendarDayButton };
