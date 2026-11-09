import type { Topic } from '@nee3/shared-types';
import { Stack } from '../../../../../atoms/Stack/Stack.tsx';
import { Text } from '../../../../../atoms/Text/Text.tsx';
import { Button } from '../../../../../atoms/Button/Button.tsx';
import { TOPIC_CHIP } from '../../../utils/topicChip.ts';

export interface TopicFilterStripProps {
  // Only the Topics the catalog can actually be filtered by - the ones its Sources carry. A
  // Topic nobody carries any more stays in the vocabulary, but a filter that can only empty the
  // shelf is not worth offering (CONTEXT.md, Topic).
  topics: Topic[];
  selectedTopicId: number | null;
  onSelect: (topicId: number | null) => void;
}

// The catalog's filter strip: one Topic at a time, and pressing the pressed one clears it. A
// cross-cutting label, never a container - filtering narrows what the shelf shows rather than
// moving a Source into a folder (CONTEXT.md, Topic).
export function TopicFilterStrip({ topics, selectedTopicId, onSelect }: TopicFilterStripProps) {
  if (topics.length === 0) return null;

  return (
    <Stack direction="row" align="center" gap="2" wrap="wrap">
      <Text as="span" textStyle="label" color="inkSoft">
        Topics
      </Text>
      {topics.map((topic) => {
        const pressed = topic.id === selectedTopicId;
        return (
          <Button
            key={topic.id}
            type="button"
            size="xs"
            variant="ghost"
            // A pressed toggle rather than a link or a radio: the strip is a way of looking at
            // the shelf, and pressing the pressed one puts the whole shelf back.
            aria-pressed={pressed}
            /* eslint-disable-next-line react/jsx-props-no-spreading -- TOPIC_CHIP is a
               shared set of Chakra style props, not forwarded component props: one
               chip shape for every place a Topic is shown. */
            {...TOPIC_CHIP}
            h="auto"
            // Pressed fills with the same rust the chip is drawn in rather than taking a second
            // border, so the strip reads as one row with one of its words picked out.
            bg={pressed ? 'rust' : 'paper'}
            color={pressed ? 'paper' : 'rust'}
            _hover={{ bg: pressed ? 'rust' : 'paperCard' }}
            onClick={() => onSelect(pressed ? null : topic.id)}
          >
            {topic.name}
          </Button>
        );
      })}
    </Stack>
  );
}
