import type { AnchorWithBeats, EmotionalBeat } from '@nee3/shared-types';
import { Button } from '../../../../atoms/Button/Button.tsx';
import { Card } from '../../../../atoms/Card/Card.tsx';
import { Heading } from '../../../../atoms/Heading/Heading.tsx';
import { Stack } from '../../../../atoms/Stack/Stack.tsx';
import { Text } from '../../../../atoms/Text/Text.tsx';

export interface EmotionalBeatsListProps {
  anchors: AnchorWithBeats[];
  onEdit: (beat: EmotionalBeat) => void;
  onDelete: (beatId: number) => void;
}

// Existing attachments aren't only reachable by re-selecting their anchored text - this
// list is where a returning user edits or deletes an emotional beat added on a prior visit.
export function EmotionalBeatsList({ anchors, onEdit, onDelete }: EmotionalBeatsListProps) {
  const beats = anchors.flatMap((anchor) => anchor.emotionalBeats);
  if (beats.length === 0) return null;

  return (
    <Stack direction="column" gap="2">
      <Heading as="h2" variant="section">
        Emotional beats
      </Heading>
      {beats.map((beat) => (
        <Card
          key={beat.id}
          padding="sm"
          display="flex"
          flexDirection="row"
          alignItems="center"
          gap="3"
        >
          <Text flex="1">{beat.label}</Text>
          <Button type="button" size="sm" variant="ghost" onClick={() => onEdit(beat)}>
            Edit
          </Button>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            color="rust"
            onClick={() => onDelete(beat.id)}
          >
            Delete
          </Button>
        </Card>
      ))}
    </Stack>
  );
}
