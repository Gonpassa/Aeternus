import { useState } from 'react';
import { Calendar } from '../../atoms/Calendar/Calendar.tsx';
import { Card } from '../../atoms/Card/Card.tsx';
import { Section } from './Section.tsx';

export function CalendarDemo() {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());

  return (
    <Section title="Calendar" description="react-day-picker, single-select mode">
      <Card p="2" w="fit-content">
        <Calendar mode="single" selected={selectedDate} onSelect={setSelectedDate} />
      </Card>
    </Section>
  );
}
