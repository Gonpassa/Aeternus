import { useState } from 'react';
import { Select } from '../../atoms/Select/Select.tsx';
import { Stack } from '../../atoms/Stack/Stack.tsx';
import { Text } from '../../atoms/Text/Text.tsx';
import { Section } from './Section.tsx';

const MOODS = [
  { value: 'anxious', label: 'Anxious' },
  { value: 'content', label: 'Content' },
  { value: 'restless', label: 'Restless', disabled: true },
];

const PASSES = [
  { value: 'analytic', label: 'Analytic', hint: 'backward, to its sources' },
  { value: 'synthetic', label: 'Synthetic', hint: 'forward, as a whole' },
];

const MONTHS = [
  { value: '3', label: 'April' },
  { value: '8', label: 'September' },
  { value: '10', label: 'November' },
];

export function SelectDemo() {
  const [mood, setMood] = useState('content');
  const [pass, setPass] = useState('analytic');
  const [month, setMonth] = useState('3');
  const [unset, setUnset] = useState('');

  return (
    <Section title="Select" description="single-value select built on Ark UI">
      <Stack direction="column" align="start" gap="6">
        <Stack direction="column" align="start" gap="1">
          <Text variant="eyebrow" color="inkSoft">
            labels only, one option disabled
          </Text>
          <Select aria-label="Mood" items={MOODS} value={mood} onChange={setMood} />
        </Stack>

        <Stack direction="column" align="start" gap="1">
          <Text variant="eyebrow" color="inkSoft">
            itemSlot, for a row with subtext
          </Text>
          <Select
            aria-label="Analysis pass"
            items={PASSES}
            value={pass}
            onChange={setPass}
            itemSlot={(item) => (
              <Stack direction="column" align="start" gap="0">
                <Text as="span">{item.label}</Text>
                <Text as="span" variant="eyebrow" color="inkSoft">
                  {item.hint}
                </Text>
              </Stack>
            )}
          />
        </Stack>

        <Stack direction="column" align="start" gap="1">
          <Text variant="eyebrow" color="inkSoft">
            options of differing width - the trigger holds the widest
          </Text>
          <Select aria-label="Month" items={MONTHS} value={month} onChange={setMonth} />
        </Stack>

        <Stack direction="column" align="start" gap="1">
          <Text variant="eyebrow" color="inkSoft">
            placeholder, with nothing selected
          </Text>
          <Select
            aria-label="Mood, unset"
            items={MOODS}
            value={unset}
            placeholder="Choose a mood"
            onChange={setUnset}
          />
        </Stack>
      </Stack>
    </Section>
  );
}
