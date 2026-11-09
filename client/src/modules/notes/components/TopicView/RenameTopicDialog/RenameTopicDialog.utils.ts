import { z } from 'zod';
import type { TopicListEntry } from '@nee3/shared-types';
import { TOPIC_NAME_MAX } from '../../../utils/topicLimits.ts';

// One space for any run of whitespace, as the server collapses it, so a name is the same
// rename - and the same merge - however it was spaced.
export const collapseTopicName = (value: string): string => value.trim().replace(/\s+/g, ' ');

// One field, held to the same ceiling the backend holds a Topic name to. Whitespace is
// collapsed here as the server collapses it, so "Deep   work" and "Deep work" are the same
// rename and the same merge.
export const renameTopicSchema = z.object({
  name: z
    .string()
    .transform(collapseTopicName)
    .refine((value) => value.length > 0, { message: 'A Topic needs a name.' })
    .refine((value) => value.length <= TOPIC_NAME_MAX, {
      message: `A Topic name is at most ${TOPIC_NAME_MAX} characters.`,
    }),
});

export type RenameTopicFormValues = { name: string };
export type RenameTopicFormOutput = z.output<typeof renameTopicSchema>;

// The Topic the typed name already belongs to, if any: renaming into an existing name is the
// merge, so this is what turns the dialog into a confirmation rather than a save
// (CONTEXT.md, Topic). Matched case-insensitively, because casing never splits the vocabulary,
// and never against the Topic being renamed - recasing its own name is a plain rename.
export const mergeTargetFor = (
  name: string,
  topic: TopicListEntry,
  vocabulary: TopicListEntry[],
): TopicListEntry | null => {
  const wanted = collapseTopicName(name).toLowerCase();
  if (wanted === '') return null;
  return (
    vocabulary.find(
      (candidate) => candidate.id !== topic.id && candidate.name.toLowerCase() === wanted,
    ) ?? null
  );
};
