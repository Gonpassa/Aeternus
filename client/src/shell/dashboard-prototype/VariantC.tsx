// PROTOTYPE — Variant C: "Filed cards". Every journal sub-piece is its own full
// index card (tab + punch hole + catalog number), 4-col grid, railed/stitch-line
// greeting header echoing the journal page's bound-object motif. See
// DashboardPrototype.tsx.
import type { ReactNode } from 'react';
import { Link } from '@tanstack/react-router';
import type { AuthUser } from '@nee3/shared-types';
import { Card } from '../../atoms/Card/Card.tsx';
import { Stack } from '../../atoms/Stack/Stack.tsx';
import { Text } from '../../atoms/Text/Text.tsx';
import { Heading } from '../../atoms/Heading/Heading.tsx';
import { Button } from '../../atoms/Button/Button.tsx';
import { Dot } from '../../atoms/Dot/Dot.tsx';
import { MOOD_DOT_COLOR, MOOD_LABEL } from '../../modules/journal/moodColors.ts';
import { stripHtml } from '../../modules/journal/textUtils.ts';
import { GhostWidget } from './GhostWidget.tsx';
import type { JournalWidgetData } from './prototypeJournalData.ts';

const today = new Date();

const SPAN_COLUMN: Record<'small' | 'medium' | 'large', string> = {
  small: 'span 1',
  medium: 'span 2',
  large: 'span 4',
};

function IndexCard({
  catalogNo,
  tabLabel,
  tabColor = 'rust',
  gridColumn,
  children,
}: {
  catalogNo: string;
  tabLabel: string;
  tabColor?: string;
  gridColumn?: string;
  children: ReactNode;
}) {
  return (
    <Stack
      direction="column"
      position="relative"
      bg="paperCard"
      borderWidth="1px"
      borderColor="line"
      p="5"
      pt="7"
      gap="3"
      gridColumn={gridColumn}
    >
      <Stack
        position="absolute"
        top="-1px"
        left="5"
        px="2.5"
        py="0.5"
        bg={tabColor}
        color="paper"
        fontFamily="mono"
        fontSize="10px"
        textTransform="uppercase"
        letterSpacing="wide"
      >
        {tabLabel}
      </Stack>
      <Dot color="ink/20" size="2" position="absolute" top="2.5" left="2.5" />
      {children}
      <Text
        position="absolute"
        bottom="2.5"
        right="3"
        fontFamily="mono"
        fontSize="10px"
        color="inkSoft"
      >
        {catalogNo}
      </Text>
    </Stack>
  );
}

export function VariantC({ user, data }: { user: AuthUser; data: JournalWidgetData }) {
  return (
    <Stack direction="column" gap="8">
      <Card variant="railed">
        <Stack direction="column" gap="1">
          <Heading fontFamily="heading" fontSize="2xl" fontWeight="semibold">
            {user.username}&rsquo;s desk
          </Heading>
          <Text
            fontFamily="mono"
            fontSize="xs"
            color="inkSoft"
            textTransform="uppercase"
            letterSpacing="wide"
          >
            {today.toLocaleDateString(undefined, {
              weekday: 'long',
              month: 'long',
              day: 'numeric',
            })}
          </Text>
        </Stack>
      </Card>

      <Stack
        display="grid"
        gridTemplateColumns={{ base: '1fr', md: 'repeat(2, 1fr)', lg: 'repeat(4, 1fr)' }}
        gap="4"
      >
        <IndexCard catalogNo="No. 001" tabLabel="Quick entry" gridColumn={SPAN_COLUMN.small}>
          <Stack asChild pt="3">
            <Link to="/journal/new">
              <Button size="sm" w="full">
                + New entry
              </Button>
            </Link>
          </Stack>
        </IndexCard>

        {data.isEmpty ? (
          <IndexCard
            catalogNo="No. 000"
            tabLabel="Empty"
            tabColor="moss"
            gridColumn={`${SPAN_COLUMN.medium} / span 3`}
          >
            <Stack direction="column" gap="2" pt="3">
              <Heading fontFamily="heading" fontSize="md" fontWeight="medium">
                Nothing filed yet.
              </Heading>
              <Text color="inkSoft" fontSize="sm">
                Your streak and mood cards will appear here once you start your first entry.
              </Text>
            </Stack>
          </IndexCard>
        ) : (
          <>
            <IndexCard catalogNo="No. 002" tabLabel="Recent" gridColumn={SPAN_COLUMN.medium}>
              <Stack direction="column" gap="1.5" pt="3">
                {data.recentEntries.map((entry) => (
                  <Stack key={entry.id} justify="space-between" align="baseline">
                    <Text fontSize="sm" lineClamp={1}>
                      {entry.title || stripHtml(entry.content).slice(0, 30)}
                    </Text>
                    <Text fontFamily="mono" fontSize="10px" color="inkSoft">
                      {entry.date}
                    </Text>
                  </Stack>
                ))}
              </Stack>
            </IndexCard>
            <IndexCard catalogNo="No. 003" tabLabel="Streak" gridColumn={SPAN_COLUMN.small}>
              <Text fontFamily="heading" fontSize="2xl" fontWeight="semibold" pt="3">
                {data.streakDays}d
              </Text>
            </IndexCard>
            <IndexCard
              catalogNo="No. 004"
              tabLabel="Mood"
              tabColor="moss"
              gridColumn={SPAN_COLUMN.small}
            >
              {data.latestMood && (
                <Stack align="center" gap="2" pt="3">
                  <Dot color={MOOD_DOT_COLOR[data.latestMood]} />
                  <Text fontSize="sm">{MOOD_LABEL[data.latestMood]}</Text>
                </Stack>
              )}
            </IndexCard>
          </>
        )}

        <GhostWidget label="future widget" gridColumn={SPAN_COLUMN.large} />
      </Stack>
      <Text variant="eyebrow" color="inkSoft/70">
        Grid illustration (prototype only) — base: 1 col, md: 2 col, lg: 4 col, spans
        small=1/medium=2/large=4
      </Text>
    </Stack>
  );
}
