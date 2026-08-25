// PROTOTYPE - variant C: master-detail split, compact list on the left, full entry on the right.
import { useState } from 'react';
import { Link } from '@tanstack/react-router';
import type { Entry } from '@nee3/shared-types';
import { MOOD_DOT_COLOR, MOOD_LABEL } from '../moodColors.ts';
import { stripHtml } from '../textUtils.ts';
import { Stack } from '../../../atoms/Stack/Stack.tsx';
import { Heading } from '../../../atoms/Heading/Heading.tsx';
import { Text } from '../../../atoms/Text/Text.tsx';
import { Dot } from '../../../atoms/Dot/Dot.tsx';
import { Button } from '../../../atoms/Button/Button.tsx';

export interface VariantReadingPaneProps {
  entries: Entry[];
}

export function VariantReadingPane({ entries }: VariantReadingPaneProps) {
  const [selectedId, setSelectedId] = useState<number | undefined>(entries[0]?.id);
  const selected = entries.find((entry) => entry.id === selectedId) ?? entries[0];

  return (
    <Stack align="flex-start" gap="6">
      <Stack
        as="ul"
        direction="column"
        gap="0"
        flex="0 0 20rem"
        borderWidth="1px"
        borderColor="line"
        bg="paperCard"
        maxH="70vh"
        overflowY="auto"
      >
        {entries.map((entry) => (
          <Stack
            as="li"
            key={entry.id}
            direction="column"
            borderBottomWidth="1px"
            borderColor="line"
            bg={entry.id === selected?.id ? 'paper' : 'transparent'}
            borderLeftWidth="2px"
            borderLeftColor={entry.id === selected?.id ? 'inkBlue' : 'transparent'}
          >
            <Stack
              asChild
              direction="column"
              gap="1"
              px="4"
              py="3"
              cursor="pointer"
              _hover={{ bg: 'paper' }}
            >
              <button type="button" onClick={() => setSelectedId(entry.id)}>
                <Stack align="center" gap="2">
                  <Dot size="2" color={MOOD_DOT_COLOR[entry.primaryMood]} />
                  <Text textStyle="label" color="inkSoft">
                    {entry.date}
                  </Text>
                </Stack>
                <Text fontFamily="heading" fontWeight="500" color="ink" textAlign="left">
                  {entry.title}
                </Text>
              </button>
            </Stack>
          </Stack>
        ))}
      </Stack>

      <Stack
        direction="column"
        flex="1"
        borderWidth="1px"
        borderColor="line"
        bg="paper"
        p="8"
        minH="70vh"
      >
        {selected ? (
          <Stack direction="column" gap="4">
            <Stack align="center" justify="space-between">
              <Stack align="center" gap="2">
                <Dot size="2.5" color={MOOD_DOT_COLOR[selected.primaryMood]} />
                <Text textStyle="label" color="inkSoft">
                  {selected.date} &middot; {MOOD_LABEL[selected.primaryMood]}
                </Text>
              </Stack>
              <Button asChild variant="outline" px="3" py="2">
                <Link to="/journal/$entryId" params={{ entryId: String(selected.id) }}>
                  Open entry
                </Link>
              </Button>
            </Stack>
            <Heading as="h2" variant="section">
              {selected.title}
            </Heading>
            <Text fontFamily="body" color="ink">
              {stripHtml(selected.content).slice(0, 600)}
            </Text>
          </Stack>
        ) : (
          <Text variant="muted">Select an entry to read it here.</Text>
        )}
      </Stack>
    </Stack>
  );
}
