// PROTOTYPE - the Topic view settled in #71: Permanent notes by Link count, then Sources.
// Contents are decided; where it sits in the nav is what the variants disagree about.
import { Stack } from '../../../atoms/Stack/Stack.tsx';
import { Text } from '../../../atoms/Text/Text.tsx';
import { Heading } from '../../../atoms/Heading/Heading.tsx';
import { Button } from '../../../atoms/Button/Button.tsx';
import { RuledNote } from '../../../atoms/RuledNote/RuledNote.tsx';
import type { NotesState } from '../prototypeNotesData.ts';
import { KIND_LABEL, linkCount, linkLabel, notesForSource } from '../prototypeNotesData.ts';

export function TopicView({
  state,
  topic,
  onOpenPermanent,
  onOpenSource,
}: {
  state: NotesState;
  topic: string;
  onOpenPermanent: (id: string) => void;
  onOpenSource: (id: string) => void;
}) {
  const permanents = state.permanentNotes
    .filter((p) => p.topics.includes(topic))
    .sort((a, b) => linkCount(state, b.id) - linkCount(state, a.id));
  const sources = state.sources.filter((s) => s.topics.includes(topic));

  return (
    <Stack direction="column" gap="8">
      <Stack direction="column" gap="1">
        <Text variant="eyebrow" color="rust">
          Topic
        </Text>
        <Heading as="h1" variant="page">
          {topic}
        </Heading>
      </Stack>
      <Stack direction="column" gap="3">
        <Text textStyle="label" color="inkSoft">
          Permanent notes &middot; most connected first
        </Text>
        {permanents.length === 0 && (
          <Text textStyle="body" color="inkSoft">
            No Permanent note carries this Topic yet.
          </Text>
        )}
        {permanents.map((p) => (
          <RuledNote key={p.id} rule="moss">
            <Button
              variant="ghost"
              h="auto"
              textTransform="none"
              letterSpacing="normal"
              px="0"
              py="0"
              whiteSpace="normal"
              textAlign="left"
              justifyContent="flex-start"
              textStyle="cardTitle"
              fontFamily="heading"
              color="ink"
              onClick={() => onOpenPermanent(p.id)}
            >
              {p.title}
            </Button>
            <Text textStyle="label" color="inkSoft" mt="1">
              {linkLabel(state, p.id)}
            </Text>
          </RuledNote>
        ))}
      </Stack>
      <Stack direction="column" gap="3">
        <Text textStyle="label" color="inkSoft">
          Sources
        </Text>
        {sources.map((s) => (
          <RuledNote key={s.id}>
            <Button
              variant="ghost"
              h="auto"
              textTransform="none"
              letterSpacing="normal"
              px="0"
              py="0"
              whiteSpace="normal"
              textAlign="left"
              justifyContent="flex-start"
              textStyle="cardTitle"
              fontFamily="heading"
              color="ink"
              onClick={() => onOpenSource(s.id)}
            >
              {s.title}
            </Button>
            <Text textStyle="label" color="inkSoft" mt="1">
              {KIND_LABEL[s.kind]} &middot; {notesForSource(state, s.id).length} notes
            </Text>
          </RuledNote>
        ))}
      </Stack>
    </Stack>
  );
}
