import { Link } from '@tanstack/react-router';
import type { Dream } from '@nee3/shared-types';
import { stripHtml } from '../../../../utils/textUtils.ts';
import { groupByMonth, dayLabel } from '../../../../utils/dateGrouping.ts';
import { Stack } from '../../../../atoms/Stack/Stack.tsx';
import { Text } from '../../../../atoms/Text/Text.tsx';

export interface DreamTimelineProps {
  dreams: Dream[];
}

export function DreamTimeline({ dreams }: DreamTimelineProps) {
  const groups = groupByMonth(dreams);

  return (
    <Stack direction="column" gap="8">
      {groups.map(([month, monthDreams]) => (
        <Stack key={month} direction="column" gap="0">
          <Text textStyle="label" color="rust" mb="3">
            {month}
          </Text>
          <Stack direction="column" borderTopWidth="1px" borderColor="line">
            {monthDreams.map((dream) => (
              <Stack
                asChild
                key={dream.id}
                gap="4"
                py="4"
                borderBottomWidth="1px"
                borderColor="line"
              >
                <Link to="/dreams/$dreamId" params={{ dreamId: String(dream.id) }}>
                  <Stack direction="column" align="center" gap="0" minW="3rem">
                    <Text textStyle="label" color="inkSoft" fontSize="1.5rem" lineHeight="1">
                      {dayLabel(dream.date)}
                    </Text>
                  </Stack>
                  <Text fontFamily="body" color="ink" flex="1">
                    {stripHtml(dream.narrative).slice(0, 160)}
                  </Text>
                </Link>
              </Stack>
            ))}
          </Stack>
        </Stack>
      ))}
    </Stack>
  );
}
