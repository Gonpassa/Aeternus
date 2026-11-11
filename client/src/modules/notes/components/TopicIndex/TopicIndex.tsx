import { Link } from '@tanstack/react-router';
import type { TopicListEntry } from '@nee3/shared-types';
import { Stack } from '../../../../atoms/Stack/Stack.tsx';
import { Text } from '../../../../atoms/Text/Text.tsx';
import { EmptyState } from '../EmptyState/EmptyState.tsx';
import { topicCarrierLabel } from '../../utils/topicCarriers.ts';

export interface TopicIndexProps {
  topics: TopicListEntry[];
}

// The whole vocabulary, in the order the server sends it - by name, since a vocabulary is read
// as a list of words rather than ranked. Every Topic is here, the ones nobody carries any more
// included: the word was chosen deliberately, and it leaves the list only when deleted
// (CONTEXT.md, Topic).
export function TopicIndex({ topics }: TopicIndexProps) {
  if (topics.length === 0) {
    return (
      <EmptyState heading="No Topics yet.">
        A Topic is created by typing it on a Source or on a Permanent note - tag a thing only when
        it is about that thing, and this becomes the list of what you read about.
      </EmptyState>
    );
  }

  return (
    <Stack as="ul" direction="column" gap="0" listStyleType="none" aria-label="Topics">
      {topics.map((topic) => (
        <Stack
          as="li"
          key={topic.id}
          direction="column"
          borderBottomWidth="1px"
          borderBottomColor="borderSoft"
          _last={{ borderBottomWidth: 0 }}
        >
          {/* The whole row is the link: a Topic is a place, and a row in an index is one
              target (#88). The carrier counts sit opposite the name rather than under it, so
              the column of numbers can be read down on its own. */}
          <Stack
            asChild
            direction="row"
            align="baseline"
            justify="space-between"
            gap="4"
            px="1"
            py="3"
            _hover={{ bg: 'paperCard' }}
          >
            <Link to="/notes/topics/$topicId" params={{ topicId: String(topic.id) }}>
              <Text textStyle="bodyStrong" color="rust">
                {topic.name}
              </Text>
              <Text textStyle="label" color="inkSoft" whiteSpace="nowrap">
                {topicCarrierLabel(topic)}
              </Text>
            </Link>
          </Stack>
        </Stack>
      ))}
    </Stack>
  );
}
