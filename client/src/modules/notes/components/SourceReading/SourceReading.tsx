import type { Source } from '@nee3/shared-types';
import { Heading } from '../../../../atoms/Heading/Heading.tsx';
import { Stack } from '../../../../atoms/Stack/Stack.tsx';
import { Text } from '../../../../atoms/Text/Text.tsx';
import { SOURCE_KIND_LABEL } from '../../sourceKinds.ts';

export interface SourceReadingProps {
  source: Source;
}

// The reading page, empty by design in this slice: it shows what the Source is, and the
// capture form, its stream of Literature notes and its Topics each arrive with their own
// ticket (#65). Nothing here reports a reading status - a Source has no lifecycle.
export function SourceReading({ source }: SourceReadingProps) {
  return (
    <Stack direction="column" gap="6">
      <Stack direction="column" gap="1">
        <Text variant="eyebrow" color="rust">
          {SOURCE_KIND_LABEL[source.kind]}
        </Text>
        <Heading as="h1" variant="page">
          {source.title}
        </Heading>
        {source.author && (
          <Text textStyle="body" color="inkSoft">
            {source.author}
          </Text>
        )}
        {/* Body type, not the label rung: that rung uppercases, and an uppercased URL reads as
            a different address from the one the user pasted. */}
        {source.url && (
          <Text textStyle="body" color="inkBlue" textDecoration="underline" asChild>
            {/* Opened away from the app, and `noreferrer` with it: where someone reads is
                theirs, and the destination has no business being told it came from here. */}
            <a href={source.url} target="_blank" rel="noreferrer">
              {source.url}
            </a>
          </Text>
        )}
      </Stack>
      <Text textStyle="body" color="inkSoft">
        Nothing written from this yet.
      </Text>
    </Stack>
  );
}
