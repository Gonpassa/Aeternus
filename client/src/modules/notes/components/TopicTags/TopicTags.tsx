import type { Topic } from '@nee3/shared-types';
import { Stack } from '../../../../atoms/Stack/Stack.tsx';
import { Text } from '../../../../atoms/Text/Text.tsx';
import { TOPIC_CHIP } from '../../utils/topicChip.ts';

export interface TopicTagsProps {
  topics: Topic[];
  // Named where the list needs saying out loud - on a filed Literature note, where the Topics
  // are the Source's rather than the note's own. Where the carrier is obvious, there is nothing
  // to caption and the chips stand alone.
  caption?: string;
  // The accessible name for the list, so a screen reader meets it as the Topics it is rather
  // than as an unlabelled row of words.
  label?: string;
}

// The Topics a carrier wears, read-only: on a catalog card, on the Source header, and inherited
// on a filed Literature note. A carrier with none renders nothing at all rather than reporting
// its own absence - Topics are optional everywhere, so having none is not missing data
// (CONTEXT.md, Topic).
export function TopicTags({ topics, caption, label = 'Topics' }: TopicTagsProps) {
  if (topics.length === 0) return null;

  return (
    <Stack direction="row" align="center" gap="2" wrap="wrap">
      {caption && (
        <Text as="span" textStyle="label" color="inkSoft">
          {caption}
        </Text>
      )}
      <Stack as="ul" direction="row" gap="2" wrap="wrap" listStyleType="none" aria-label={label}>
        {topics.map((topic) => (
          /* eslint-disable-next-line react/jsx-props-no-spreading -- TOPIC_CHIP is a shared set
             of Chakra style props, not forwarded component props. */
          <Text key={topic.id} as="li" {...TOPIC_CHIP}>
            {topic.name}
          </Text>
        ))}
      </Stack>
    </Stack>
  );
}
