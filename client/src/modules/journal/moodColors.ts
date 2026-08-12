import type { PrimaryMood } from '@nee3/shared-types';

export const MOOD_DOT_COLOR: Record<PrimaryMood, string> = {
  happy: 'rust',
  calm: 'moss',
  sad: 'inkBlue',
  anxious: 'moodAnxious',
  angry: 'moodAngry',
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
