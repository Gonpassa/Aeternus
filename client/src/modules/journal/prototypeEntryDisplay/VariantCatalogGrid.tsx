// PROTOTYPE - variant B: entries as a catalog grid of index cards.
import { Link } from '@tanstack/react-router';
import type { Entry } from '@nee3/shared-types';
import { DieCutTab, type DieCutTabColor } from '../../../atoms/DieCutTab/DieCutTab.tsx';
import { MOOD_DOT_COLOR, MOOD_LABEL } from '../moodColors.ts';
import { stripHtml } from '../textUtils.ts';
import { Grid } from '../../../atoms/Grid/Grid.tsx';
import { Stack } from '../../../atoms/Stack/Stack.tsx';
import { Heading } from '../../../atoms/Heading/Heading.tsx';
import { Text } from '../../../atoms/Text/Text.tsx';
import { Dot } from '../../../atoms/Dot/Dot.tsx';

const ACCENTS: DieCutTabColor[] = ['rust', 'moss', 'inkBlue'];

const monthTag = (isoDate: string) =>
  new Date(`${isoDate}T00:00:00`).toLocaleDateString('en-US', { month: 'short' }).toUpperCase();

const catalogNumber = (entry: Entry) => `No. ${String(entry.id).padStart(3, '0')}`;

export interface VariantCatalogGridProps {
  entries: Entry[];
}

export function VariantCatalogGrid({ entries }: VariantCatalogGridProps) {
  return (
    <Grid templateColumns="repeat(auto-fill, minmax(15rem, 1fr))" gap="8" pt="4">
      {entries.map((entry, i) => (
        <Stack
          key={entry.id}
          direction="column"
          position="relative"
          bg="paperCard"
          borderWidth="1px"
          borderColor="line"
          pt="5"
          px="5"
          pb="8"
        >
          <DieCutTab position="absolute" top="-3.5" left="8" color={ACCENTS[i % ACCENTS.length]}>
            {monthTag(entry.date)}
          </DieCutTab>
          <Stack asChild direction="column" gap="2">
            <Link to="/journal/$entryId" params={{ entryId: String(entry.id) }}>
              <Stack align="center" gap="2">
                <Dot size="2" color={MOOD_DOT_COLOR[entry.primaryMood]} />
                <Text textStyle="label" color="inkSoft">
                  {entry.date} &middot; {MOOD_LABEL[entry.primaryMood]}
                </Text>
              </Stack>
              <Heading as="h2" variant="card">
                {entry.title}
              </Heading>
              <Text fontFamily="body" color="ink">
                {stripHtml(entry.content).slice(0, 110)}
              </Text>
            </Link>
          </Stack>
          <Text
            aria-hidden="true"
            position="absolute"
            bottom="3"
            right="4"
            fontFamily="mono"
            fontSize="0.75rem"
            color="inkSoft"
          >
            {catalogNumber(entry)}
          </Text>
        </Stack>
      ))}
    </Grid>
  );
}
