import { useState } from 'react';
import {
  createListCollection,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../atoms/Select/Select.tsx';
import { Section } from './Section.tsx';

const moodCollection = createListCollection({
  items: [
    { value: 'anxious', label: 'Anxious' },
    { value: 'content', label: 'Content' },
    { value: 'restless', label: 'Restless' },
  ],
});

export function SelectDemo() {
  const [selectValue, setSelectValue] = useState<string[]>(['content']);

  return (
    <Section title="Select" description="single-value select built on Ark UI">
      <Select
        collection={moodCollection}
        value={selectValue}
        onValueChange={(details) => setSelectValue(details.value)}
      >
        <SelectTrigger>
          <SelectValue placeholder="Choose a mood" />
        </SelectTrigger>
        <SelectContent>
          {moodCollection.items.map((item) => (
            <SelectItem key={item.value} item={item}>
              {item.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </Section>
  );
}
