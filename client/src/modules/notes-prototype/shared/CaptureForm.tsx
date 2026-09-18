// PROTOTYPE - Literature note capture with a Source open, per #68: Locator (section prefilled
// from the last note, position empty and focused), own-words body, excerpt on demand. The
// feel of capture is #73's question, so this form is the same in every variant.
import { useState } from 'react';
import { Stack } from '../../../atoms/Stack/Stack.tsx';
import { Text } from '../../../atoms/Text/Text.tsx';
import { Input } from '../../../atoms/Input/Input.tsx';
import { Textarea } from '../../../atoms/Textarea/Textarea.tsx';
import { Button } from '../../../atoms/Button/Button.tsx';
import { FieldLabel } from '../../../atoms/FieldLabel/FieldLabel.tsx';
import type { LiteratureNote } from '../prototypeNotesData.ts';

export function CaptureForm({
  lastNote,
  onSave,
}: {
  lastNote: LiteratureNote | null;
  onSave: (input: {
    section: string | null;
    position: string | null;
    body: string;
    excerpt: string | null;
  }) => void;
}) {
  const [section, setSection] = useState(lastNote?.section ?? '');
  const [position, setPosition] = useState('');
  const [body, setBody] = useState('');
  const [excerpt, setExcerpt] = useState('');
  const [excerptOpen, setExcerptOpen] = useState(false);
  const canSave = body.trim().length > 0 && (section.trim() || position.trim());

  const save = () => {
    onSave({
      section: section.trim() || null,
      position: position.trim() || null,
      body: body.trim(),
      excerpt: excerpt.trim() || null,
    });
    setPosition('');
    setBody('');
    setExcerpt('');
    setExcerptOpen(false);
  };

  return (
    <Stack direction="column" gap="3">
      <Stack gap="3">
        <FieldLabel eyebrow flex="1">
          Section
          <Input
            size="sm"
            value={section}
            onChange={(e) => setSection(e.target.value)}
            placeholder="Chapter, segment, heading"
          />
        </FieldLabel>
        <FieldLabel eyebrow w="10rem">
          Position
          <Input
            size="sm"
            value={position}
            onChange={(e) => setPosition(e.target.value)}
            placeholder="Page, timestamp"
            autoFocus
          />
        </FieldLabel>
      </Stack>
      <FieldLabel eyebrow>
        In your own words
        <Textarea
          rows={3}
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="A few sentences on one point, written closed-book."
        />
      </FieldLabel>
      {excerptOpen ? (
        <FieldLabel eyebrow>
          The author&rsquo;s exact words
          <Textarea
            rows={2}
            value={excerpt}
            onChange={(e) => setExcerpt(e.target.value)}
            fontStyle="italic"
          />
        </FieldLabel>
      ) : (
        <Button
          variant="link"
          size="xs"
          alignSelf="flex-start"
          onClick={() => setExcerptOpen(true)}
        >
          Add the author&rsquo;s exact words
        </Button>
      )}
      <Stack justify="space-between" align="center">
        <Text textStyle="label" color="inkSoft">
          Save and keep reading
        </Text>
        <Button size="sm" disabled={!canSave} onClick={save}>
          Save note
        </Button>
      </Stack>
    </Stack>
  );
}
