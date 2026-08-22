import { z } from 'zod';
import type { PrimaryMood, SpecificEmotion } from '@nee3/shared-types';

export const entrySchema = z.object({
  date: z.string(),
  title: z.string().min(1, 'Title is required'),
  primaryMood: z
    .custom<PrimaryMood | null>()
    .refine((value): value is PrimaryMood => value !== null, {
      message: 'Please choose a mood.',
    }),
  specificEmotion: z.custom<SpecificEmotion | null>(),
  content: z.string(),
});

export type EntryFormValues = z.input<typeof entrySchema>;
export type EntryFormOutput = z.output<typeof entrySchema>;
