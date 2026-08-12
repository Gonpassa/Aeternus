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

export const MOOD_RING_COLOR: Record<PrimaryMood, string> = {
  happy: '#A8532F',
  calm: '#55684A',
  sad: '#2C3E52',
  anxious: '#B98A2E',
  angry: '#7A2E1E',
};
