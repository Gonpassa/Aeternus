import { useState } from 'react';
import { Stack } from '../../atoms/Stack/Stack.tsx';
import { Text } from '../../atoms/Text/Text.tsx';
import { VocabularyInput } from '../../atoms/VocabularyInput/VocabularyInput.tsx';
import { Section } from './Section.tsx';

const VOCABULARY = ['Ocean', 'Staircase', 'Mirror', 'Train station', 'Threshold', 'Tunnel'];

export function VocabularyInputDemo() {
  const [terms, setTerms] = useState<string[]>([]);
  const [cancelled, setCancelled] = useState(0);

  return (
    <Section
      title="VocabularyInput"
      description="entry for a controlled-but-growing vocabulary - type “t” for suggestions from the terms already used, anything else to create a new term"
    >
      <Stack direction="column" align="start" gap="4">
        <Text fontFamily="mono" fontSize="sm" color="inkSoft">
          submitted: {terms.length > 0 ? terms.join(', ') : '-'} · cancelled: {cancelled}
        </Text>

        {/* Side by side, since the suggestion list drops over whatever sits below it. */}
        <Stack direction="row" align="start" gap="10" pb="40">
          <Stack direction="column" align="start" gap="1" w="56">
            <Text variant="eyebrow" color="inkSoft">
              existing vocabulary, submit label “Tag”
            </Text>
            <VocabularyInput
              vocabulary={VOCABULARY}
              label="Symbol name"
              placeholder="Symbol name…"
              submitLabel="Tag"
              onSubmit={(term) => setTerms((current) => [...current, term])}
              onCancel={() => setCancelled((count) => count + 1)}
            />
          </Stack>

          <Stack direction="column" align="start" gap="1" w="56">
            <Text variant="eyebrow" color="inkSoft">
              empty vocabulary, default submit label
            </Text>
            <VocabularyInput
              vocabulary={[]}
              label="Topic name"
              placeholder="Topic name…"
              onSubmit={(term) => setTerms((current) => [...current, term])}
              onCancel={() => setCancelled((count) => count + 1)}
            />
          </Stack>
        </Stack>
      </Stack>
    </Section>
  );
}
