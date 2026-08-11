import type { PrimaryMood } from '@nee3/shared-types';

export const MOOD_DOT_CLASS: Record<PrimaryMood, string> = {
  happy: 'bg-rust',
  calm: 'bg-moss',
  sad: 'bg-ink-blue',
  anxious: 'bg-mood-anxious',
  angry: 'bg-mood-angry',
};

export const MOOD_LABEL: Record<PrimaryMood, string> = {
  happy: 'Happy',
  calm: 'Calm',
  sad: 'Sad',
  anxious: 'Anxious',
  angry: 'Angry',
};
