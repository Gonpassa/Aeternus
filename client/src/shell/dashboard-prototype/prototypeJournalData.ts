// PROTOTYPE — throwaway. Answers issue #23 (dashboard visual/layout). Delete after decision is captured.
//
// Stands in for the real journal-widget descriptor (issue #21's registry work hasn't
// landed yet). Derives recent-entries/streak/mood from the real, live-fetched entries
// so the variants are judged against real data density, not fake placeholders.
import { useMemo } from 'react';
import type { Entry, PrimaryMood } from '@nee3/shared-types';
import { useEntries } from '../../modules/journal/api/journalHooks.ts';

export interface JournalWidgetData {
  isLoading: boolean;
  isEmpty: boolean;
  recentEntries: Entry[];
  streakDays: number;
  latestMood: PrimaryMood | null;
}

function toIsoDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function computeStreak(entries: Entry[]): number {
  const dates = new Set(entries.map((entry) => entry.date));
  const cursor = new Date();
  let streak = 0;
  while (dates.has(toIsoDate(cursor))) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

export function useJournalWidgetData(): JournalWidgetData {
  const { data, isLoading } = useEntries(1);

  return useMemo(() => {
    const entries = [...(data?.entries ?? [])].sort((a, b) => (a.date < b.date ? 1 : -1));

    return {
      isLoading,
      isEmpty: !isLoading && entries.length === 0,
      recentEntries: entries.slice(0, 3),
      streakDays: computeStreak(entries),
      latestMood: entries[0]?.primaryMood ?? null,
    };
  }, [data, isLoading]);
}
