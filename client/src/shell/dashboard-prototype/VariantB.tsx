// PROTOTYPE — Variant B: "Catalog density". 3-col grid, simplified flat-card chrome
// (no tab/punch-hole — that motif stays reserved for the research catalog), compact
// inline greeting, quiet text-link empty state. See DashboardPrototype.tsx.
import type { ReactNode } from 'react';
import { Link } from '@tanstack/react-router';
import type { AuthUser } from '@nee3/shared-types';
import { Card } from '../../atoms/Card/Card.tsx';
import { Stack } from '../../atoms/Stack/Stack.tsx';
import { Text } from '../../atoms/Text/Text.tsx';
import { Dot } from '../../atoms/Dot/Dot.tsx';
import { MOOD_DOT_COLOR, MOOD_LABEL } from '../../modules/journal/moodColors.ts';
import { stripHtml } from '../../modules/journal/textUtils.ts';
import { GhostWidget } from './GhostWidget.tsx';
import type { JournalWidgetData } from './prototypeJournalData.ts';

const today = new Date();

const SPAN_COLUMN: Record<'small' | 'medium' | 'large', string> = {
  small: 'span 1',
  medium: 'span 2',
  large: 'span 3',
};

function Quadrant({ label, children }: { label: string; children: ReactNode }) {
  return (
    <Stack direction="column" gap="2" borderTopWidth="1px" borderColor="line" pt="3">
      <Text variant="eyebrow" color="inkSoft">
        {label}
      </Text>
      {children}
    </Stack>
  );
}

export function VariantB({ user, data }: { user: AuthUser; data: JournalWidgetData }) {
  return (
    <Stack direction="column" gap="8">
      <Stack justify="space-between" align="baseline" wrap="wrap" gap="2">
        <Text fontFamily="mono" fontSize="sm" letterSpacing="wide">
          {today.toLocaleDateString(undefined, {
            weekday: 'short',
            month: 'short',
            day: 'numeric',
          })}
          {' — welcome back, '}
          {user.username}
        </Text>
      </Stack>

      <Stack display="grid" gridTemplateColumns={{ base: '1fr', md: 'repeat(3, 1fr)' }} gap="4">
        <Card gridColumn={{ base: 'auto', md: SPAN_COLUMN.large }} padding="md">
          <Stack justify="space-between" align="baseline" mb="4">
            <Text variant="eyebrow" color="inkSoft">
              Journal
            </Text>
            <Stack asChild>
              <Link to="/journal/new">
                <Text
                  as="span"
                  color="moss"
                  fontFamily="mono"
                  fontSize="xs"
                  textTransform="uppercase"
                >
                  + New entry
                </Text>
              </Link>
            </Stack>
          </Stack>

          <Stack
            display="grid"
            gridTemplateColumns={{ base: '1fr', md: data.isEmpty ? '1fr' : 'repeat(3, 1fr)' }}
            gap="4"
          >
            {data.isEmpty ? (
              <Quadrant label="Start here">
                <Text color="inkSoft" fontSize="sm">
                  No entries yet.{' '}
                  <Stack asChild display="inline">
                    <Link to="/journal/new">
                      <Text as="span" color="moss" textDecoration="underline">
                        Start your first entry
                      </Text>
                    </Link>
                  </Stack>
                </Text>
              </Quadrant>
            ) : (
              <>
                <Quadrant label="Recent">
                  <Stack direction="column" gap="1.5">
                    {data.recentEntries.map((entry) => (
                      <Text key={entry.id} fontSize="sm" lineClamp={1}>
                        {entry.title || stripHtml(entry.content).slice(0, 30)}
                      </Text>
                    ))}
                  </Stack>
                </Quadrant>
                <Quadrant label="Streak">
                  <Text fontFamily="heading" fontSize="xl" fontWeight="semibold">
                    {data.streakDays}d
                  </Text>
                </Quadrant>
                <Quadrant label="Mood">
                  {data.latestMood && (
                    <Stack align="center" gap="2">
                      <Dot color={MOOD_DOT_COLOR[data.latestMood]} />
                      <Text fontSize="sm">{MOOD_LABEL[data.latestMood]}</Text>
                    </Stack>
                  )}
                </Quadrant>
              </>
            )}
          </Stack>
        </Card>

        <GhostWidget label="small" gridColumn={{ base: 'auto', md: SPAN_COLUMN.small }} />
        <GhostWidget label="medium" gridColumn={{ base: 'auto', md: SPAN_COLUMN.medium }} />
      </Stack>
      <Text variant="eyebrow" color="inkSoft/70">
        Grid illustration (prototype only) — base: 1 col, md: 3 col, spans small=1/medium=2/large=3
      </Text>
    </Stack>
  );
}
