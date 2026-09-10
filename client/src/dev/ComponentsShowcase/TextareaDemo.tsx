import { useState } from 'react';
import { FieldLabel } from '../../atoms/FieldLabel/FieldLabel.tsx';
import { Stack } from '../../atoms/Stack/Stack.tsx';
import { Textarea } from '../../atoms/Textarea/Textarea.tsx';
import { Section } from './Section.tsx';

export function TextareaDemo() {
  const [draft, setDraft] = useState('');

  return (
    <Section title="Textarea" description="multi-line text input, from atoms/Textarea">
      <Stack direction="column" gap="4" maxW="28rem" align="stretch">
        <FieldLabel htmlFor="textarea-demo">
          Editable
          <Textarea
            id="textarea-demo"
            value={draft}
            rows={3}
            placeholder="Type to see the moss focus ring…"
            onChange={(event) => setDraft(event.target.value)}
          />
        </FieldLabel>
        <FieldLabel htmlFor="textarea-demo-disabled">
          Disabled
          <Textarea
            id="textarea-demo-disabled"
            rows={2}
            defaultValue="Read-only content."
            disabled
          />
        </FieldLabel>
      </Stack>
    </Section>
  );
}
