import { Link } from '@tanstack/react-router';
import type { Entry } from '@nee3/shared-types';
import { MOOD_DOT_COLOR, MOOD_LABEL } from '../../moodColors.ts';
import { stripHtml } from '../../textUtils.ts';
import { Stack } from '../../../../atoms/Stack/Stack.tsx';
import { Heading } from '../../../../atoms/Heading/Heading.tsx';
import { Text } from '../../../../atoms/Text/Text.tsx';
import { Dot } from '../../../../atoms/Dot/Dot.tsx';

const monthLabel = (isoDate: string) =>
  new Date(`${isoDate}T00:00:00`).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

const dayLabel = (isoDate: string) =>
  new Date(`${isoDate}T00:00:00`).toLocaleDateString('en-US', { day: '2-digit' });

const groupByMonth = (entries: Entry[]) => {
  const groups = new Map<string, Entry[]>();
  entries.forEach((entry) => {
    const key = monthLabel(entry.date);
    const bucket = groups.get(key);
    if (bucket) bucket.push(entry);
    else groups.set(key, [entry]);
  });
  return Array.from(groups.entries());
};

export interface EntryTimelineProps {
  entries: Entry[];
}

export function EntryTimeline({ entries }: EntryTimelineProps) {
  const groups = groupByMonth(entries);

  return (
    <Stack direction="column" gap="8">
      {groups.map(([month, monthEntries]) => (
        <Stack key={month} direction="column" gap="0">
          <Text textStyle="label" color="rust" mb="3">
            {month}
          </Text>
          <Stack direction="column" borderTopWidth="1px" borderColor="line">
            {monthEntries.map((entry) => (
              <Stack
                asChild
                key={entry.id}
                gap="4"
                py="4"
                borderBottomWidth="1px"
                borderColor="line"
              >
                <Link to="/journal/$entryId" params={{ entryId: String(entry.id) }}>
                  <Stack direction="column" align="center" gap="0" minW="3rem">
                    <Text textStyle="label" color="inkSoft" fontSize="1.5rem" lineHeight="1">
                      {dayLabel(entry.date)}
                    </Text>
                  </Stack>
                  <Stack direction="column" gap="1" flex="1">
                    <Stack align="center" gap="2">
                      <Dot size="2" color={MOOD_DOT_COLOR[entry.primaryMood]} />
                      <Text textStyle="label" color="inkSoft">
                        {MOOD_LABEL[entry.primaryMood]}
                      </Text>
                    </Stack>
                    <Heading as="h2" variant="card">
                      {entry.title}
                    </Heading>
                    <Text fontFamily="body" color="ink">
                      {stripHtml(entry.content).slice(0, 160)}
                    </Text>
                  </Stack>
                </Link>
              </Stack>
            ))}
          </Stack>
        </Stack>
      ))}
    </Stack>
  );
}
