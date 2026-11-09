import { useState } from 'react';
import { X } from 'lucide-react';
import { Button } from '../../../../atoms/Button/Button.tsx';
import { IconButton } from '../../../../atoms/IconButton/IconButton.tsx';
import { Stack } from '../../../../atoms/Stack/Stack.tsx';
import { Text } from '../../../../atoms/Text/Text.tsx';
import { VocabularyInput } from '../../../../atoms/VocabularyInput/VocabularyInput.tsx';
import { TOPIC_CHIP } from '../../utils/topicChip.ts';

export interface TopicTaggerProps {
  // The names this carrier should end up with, in the order they were put on it. Names rather
  // than records, because typing a name is how a Topic is created: an unknown name is a new
  // Topic, and the vocabulary resolves a known one case-insensitively on the server.
  names: string[];
  // The user's whole Topic vocabulary, as the suggestions the input offers.
  vocabulary: string[];
  onChange: (names: string[]) => void;
}

// Topics on a carrier being written or corrected: the New Source form, the Source header's
// correction, and the Permanent note composer. Optional in all three and never required -
// object-tag discipline is the guidance copy below rather than a constraint, because a required
// Topic guarantees vague ones (#87).
export function TopicTagger({ names, vocabulary, onChange }: TopicTaggerProps) {
  const [adding, setAdding] = useState(false);

  // Case-insensitive, as the vocabulary itself is: typing "water" onto a carrier already wearing
  // "Water" is the same Topic twice, which says nothing.
  const add = (name: string) => {
    if (!names.some((already) => already.toLowerCase() === name.toLowerCase())) {
      onChange([...names, name]);
    }
    setAdding(false);
  };

  return (
    <Stack direction="column" gap="2" align="flex-start">
      <Text as="span" textStyle="label" color="inkSoft">
        Topics
      </Text>
      {names.length > 0 && (
        <Stack as="ul" direction="row" gap="2" wrap="wrap" listStyleType="none" aria-label="Topics">
          {names.map((name) => (
            /* eslint-disable-next-line react/jsx-props-no-spreading -- TOPIC_CHIP is a shared set
               of Chakra style props, not forwarded component props. */
            <Stack as="li" key={name} direction="row" align="center" gap="1" {...TOPIC_CHIP}>
              {name}
              <IconButton
                type="button"
                icon={X}
                size="xs"
                variant="ghost"
                color="rust"
                aria-label={`Remove the Topic ${name}`}
                onClick={() => onChange(names.filter((kept) => kept !== name))}
              />
            </Stack>
          ))}
        </Stack>
      )}
      {adding ? (
        <VocabularyInput
          vocabulary={vocabulary}
          label="Topic name"
          placeholder="Topic name…"
          submitLabel="Add"
          onSubmit={add}
          onCancel={() => setAdding(false)}
        />
      ) : (
        <Button type="button" size="xs" variant="ghost" onClick={() => setAdding(true)}>
          {names.length === 0 ? 'Add a Topic' : 'Add another Topic'}
        </Button>
      )}
      {/* The discipline is said here rather than enforced: tag a thing only when it is about
          that thing, and leave it untagged when no word is true of it. */}
      <Text textStyle="body" fontSize="sm" color="inkSoft">
        Optional. A Topic is what this is <em>about</em> - leave it off rather than reach for a
        vague one.
      </Text>
    </Stack>
  );
}
