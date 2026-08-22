// PROTOTYPE — Variant A: "Notebook ledger". One dominant full-index-card widget,
// generous Fraunces greeting, primary-button empty state. See DashboardPrototype.tsx.
import type { ReactNode } from 'react';
import { Link } from '@tanstack/react-router';
import type { AuthUser } from '@nee3/shared-types';
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

function IndexCardShell({ catalogNo, children }: { catalogNo: string; children: ReactNode }) {
  return (
    <Stack
      direction="column"
      position="relative"
      bg="paperCard"
      borderWidth="1px"
      borderColor="line"
      p="6"
      pt="8"
      gap="5"
    >
      <Stack
        position="absolute"
        top="-1px"
        left="6"
        px="3"
        py="1"
        bg="rust"
        color="paper"
        fontFamily="mono"
        fontSize="10px"
        textTransform="uppercase"
        letterSpacing="wide"
      >
        Journal
      </Stack>
      <Dot color="ink/20" size="2.5" position="absolute" top="3" left="3" />
      {children}
      <Text
        position="absolute"
        bottom="3"
        right="4"
        fontFamily="mono"
        fontSize="11px"
        color="inkSoft"
      >
        {catalogNo}
      </Text>
    </Stack>
  );
}

export function VariantA({ user, data }: { user: AuthUser; data: JournalWidgetData }) {
  return (
    <Stack direction="column" gap="10" maxW="42rem">
      <Stack direction="column" gap="1">
        <Heading variant="page">Good to see you, {user.username}.</Heading>
        <Text
          fontFamily="mono"
          fontSize="xs"
          textTransform="uppercase"
          letterSpacing="wide"
          color="inkSoft"
        >
          {today.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}
        </Text>
      </Stack>

      <Stack direction="column" gap="6">
        <IndexCardShell catalogNo="No. 001">
          <Stack asChild>
            <Link to="/journal/new">
              <Button variant="outline" size="sm">
                + New entry
              </Button>
            </Link>
          </Stack>

          {data.isEmpty ? (
            <Stack
              direction="column"
              align="flex-start"
              gap="3"
              borderTopWidth="1px"
              borderColor="line"
              pt="5"
            >
              <Heading fontFamily="heading" fontSize="lg" fontWeight="medium">
                Nothing filed yet.
              </Heading>
              <Text color="inkSoft">
                Start your first entry and this card will start tracking your streak and mood.
              </Text>
              <Stack asChild>
                <Link to="/journal/new">
                  <Button size="sm">Start your first entry</Button>
                </Link>
              </Stack>
            </Stack>
          ) : (
            <Stack direction="column" gap="5" borderTopWidth="1px" borderColor="line" pt="5">
              <Stack direction="column" gap="2">
                <Text variant="eyebrow" color="inkSoft">
                  Recent entries
                </Text>
                {data.recentEntries.map((entry) => (
                  <Stack key={entry.id} justify="space-between" align="baseline">
                    <Text fontFamily="body" fontSize="sm">
                      {entry.title || stripHtml(entry.content).slice(0, 40)}
                    </Text>
                    <Text fontFamily="mono" fontSize="11px" color="inkSoft">
                      {entry.date}
                    </Text>
                  </Stack>
                ))}
              </Stack>
              <Stack gap="8">
                <Stack direction="column" gap="1">
                  <Text variant="eyebrow" color="inkSoft">
                    Streak
                  </Text>
                  <Text fontFamily="heading" fontSize="2xl" fontWeight="semibold">
                    {data.streakDays}d
                  </Text>
                </Stack>
                {data.latestMood && (
                  <Stack direction="column" gap="1">
                    <Text variant="eyebrow" color="inkSoft">
                      Latest mood
                    </Text>
                    <Stack align="center" gap="2">
                      <Dot color={MOOD_DOT_COLOR[data.latestMood]} />
                      <Text fontSize="sm">{MOOD_LABEL[data.latestMood]}</Text>
                    </Stack>
                  </Stack>
                )}
              </Stack>
            </Stack>
          )}
        </IndexCardShell>

        <Stack direction="column" gap="4">
          <Text variant="eyebrow" color="inkSoft/70">
            Grid illustration (prototype only) — base: 1 col, md: 2 col
          </Text>
          <Stack direction={{ base: 'column', md: 'row' }} gap="4">
            <GhostWidget label="small widget" />
            <GhostWidget label="medium widget" />
          </Stack>
        </Stack>
      </Stack>
    </Stack>
  );
}
