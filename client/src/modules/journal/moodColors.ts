import type { PrimaryMood } from '@nee3/shared-types';

export const MOOD_DOT_COLOR: Record<PrimaryMood, string> = {
  happy: 'moss',
  calm: 'moodCalm',
  sad: 'inkBlue',
  anxious: 'moodAnxious',
  angry: 'moodAngry',
  steady: 'moodSteady',
};

export const MOOD_LABEL: Record<PrimaryMood, string> = {
  happy: 'Happy',
  calm: 'Calm',
  sad: 'Sad',
  anxious: 'Anxious',
  angry: 'Angry',
  steady: 'Steady',
};

export const MOOD_RING_COLOR: Record<PrimaryMood, string> = {
  happy: '#55684A',
  calm: '#C9743A',
  sad: '#2C3E52',
  anxious: '#B98A2E',
  angry: '#7A2E1E',
  steady: '#8A7D5C',
};
