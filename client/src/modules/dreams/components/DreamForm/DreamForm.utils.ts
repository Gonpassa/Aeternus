import { z } from 'zod';

export const dreamSchema = z.object({
  date: z.string(),
  narrative: z.string().min(1, 'Narrative is required'),
});

export type DreamFormValues = z.input<typeof dreamSchema>;
export type DreamFormOutput = z.output<typeof dreamSchema>;
