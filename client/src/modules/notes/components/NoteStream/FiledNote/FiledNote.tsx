import { useState } from 'react';
import type { LiteratureNote } from '@nee3/shared-types';
import { Button } from '../../../../../atoms/Button/Button.tsx';
import { IndexCard } from '../../../../../atoms/IndexCard/IndexCard.tsx';
import { Stack } from '../../../../../atoms/Stack/Stack.tsx';
import { Text } from '../../../../../atoms/Text/Text.tsx';
import { cardLocator } from './FiledNote.utils.ts';

export interface FiledNoteProps {
  note: LiteratureNote;
}

// A filed note is the same card it was written on, which is the point of writing it there:
// nothing is translated between writing and reading (#73). The body keeps the line breaks it
// was typed with - the one piece of structure a plain field carries (ADR 0017) - and the
// author's words stay a slip revealed on demand rather than prose mixed into the user's own.
export function FiledNote({ note }: FiledNoteProps) {
  const [excerptShown, setExcerptShown] = useState(false);
  const { tab, catalogNumber } = cardLocator(note);

  return (
    <IndexCard
      label={tab}
      catalogNumber={catalogNumber}
      // The accent carries the card's one distinction: rust for a note left as an open
      // question, the quieter moss for one the reader was clear about. The flag is named in
      // words as well, since a colour on its own is not a signal.
      accent={note.openQuestion ? 'rust' : 'moss'}
      pb="10"
    >
      <Stack direction="column" gap="3" pt="1">
        {note.openQuestion && (
          <Text variant="eyebrow" color="rust">
            Open question
          </Text>
        )}
        <Text textStyle="body" color="ink" whiteSpace="pre-wrap">
          {note.body}
        </Text>
        {note.excerpt !== null && (
          <Stack direction="column" gap="2" align="flex-start">
            <Button
              type="button"
              size="xs"
              variant="ghost"
              aria-expanded={excerptShown}
              onClick={() => setExcerptShown(!excerptShown)}
            >
              {excerptShown ? "Hide the author's words" : "The author's words"}
            </Button>
            {excerptShown && (
              <Text
                textStyle="body"
                color="inkSoft"
                whiteSpace="pre-wrap"
                bg="paper"
                borderLeftWidth="3px"
                borderLeftColor="rust"
                pl="3"
                py="2"
                w="full"
              >
                {note.excerpt}
              </Text>
            )}
          </Stack>
        )}
      </Stack>
    </IndexCard>
  );
}
