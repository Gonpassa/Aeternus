import type { TopicPermanentNote } from '@nee3/shared-types';
import { Card } from '../../../../../atoms/Card/Card.tsx';
import { Heading } from '../../../../../atoms/Heading/Heading.tsx';
import { Stack } from '../../../../../atoms/Stack/Stack.tsx';
import { Text } from '../../../../../atoms/Text/Text.tsx';
import { countLabel } from '../../../../../utils/countLabel.ts';

export interface TopicNoteCardProps {
  note: TopicPermanentNote;
}

// One Permanent note as the Topic view lists it: the title, which states the idea as a claim,
// over the idea written out. The connection count is said quietly at the foot - it is the order
// the list is in rather than a score, and the most connected note is already at the top (#88).
export function TopicNoteCard({ note }: TopicNoteCardProps) {
  return (
    <Card as="li" variant="railed">
      <Stack direction="column" gap="2">
        <Heading as="h3" variant="card">
          {note.title}
        </Heading>
        {/* Plain text, rendered as written: the line breaks the user typed are the one piece
            of structure the body carries (ADR 0017). */}
        <Text textStyle="body" color="ink" whiteSpace="pre-wrap">
          {note.body}
        </Text>
        <Text textStyle="label" color="inkSoft">
          {countLabel(note.linkCount, 'connection', 'connections')}
        </Text>
      </Stack>
    </Card>
  );
}
