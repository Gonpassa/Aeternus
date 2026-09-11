import { RuledNote } from '../../atoms/RuledNote/RuledNote.tsx';
import { Stack } from '../../atoms/Stack/Stack.tsx';
import { Text } from '../../atoms/Text/Text.tsx';
import { Section } from './Section.tsx';

export function RuledNoteDemo() {
  return (
    <Section
      title="RuledNote"
      description="annotated block with a meaning-carrying left rule, from atoms/RuledNote"
    >
      <Stack direction="column" gap="4" maxW="28rem" align="stretch">
        <RuledNote rule="hairline">
          <Text textStyle="body">hairline - a margin note at rest</Text>
        </RuledNote>
        <RuledNote rule="rust">
          <Text textStyle="body">rust - the margin note of the active Anchor</Text>
        </RuledNote>
        <RuledNote rule="inkBlue">
          <Text textStyle="body">inkBlue - an Analytic pass, tracing elements backward</Text>
        </RuledNote>
        <RuledNote rule="moss">
          <Text textStyle="body">moss - a Synthetic pass, reading the dream forward</Text>
        </RuledNote>
      </Stack>
    </Section>
  );
}
