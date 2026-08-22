import type { Entry } from '@nee3/shared-types';
import { Card } from '../../../../atoms/Card/Card.tsx';
import { Text } from '../../../../atoms/Text/Text.tsx';
import { Heading } from '../../../../atoms/Heading/Heading.tsx';
import { Stack } from '../../../../atoms/Stack/Stack.tsx';
import { Dot } from '../../../../atoms/Dot/Dot.tsx';
import { Prose } from '../../../../atoms/Prose/Prose.tsx';
import { MOOD_DOT_COLOR, MOOD_LABEL } from '../../moodColors.ts';

export interface EntryViewProps {
  entry: Entry;
}

export function EntryView({ entry }: EntryViewProps) {
  return (
    <Card as="article" variant="railed" maxW="2xl">
      <Text variant="eyebrow" letterSpacing="wide" color="inkSoft">
        {entry.date}
      </Text>
      <Heading as="h1" variant="page">
        {entry.title}
      </Heading>
      <Stack
        mt="1"
        align="center"
        gap="1.5"
        fontFamily="mono"
        fontSize="xs"
        textTransform="uppercase"
        color="inkSoft"
      >
        <Dot size="2.5" color={MOOD_DOT_COLOR[entry.primaryMood]} />
        {MOOD_LABEL[entry.primaryMood]}
        {entry.specificEmotion && <> &middot; {entry.specificEmotion}</>}
      </Stack>
      <Prose
        mt="6"
        fontFamily="body"
        fontSize="17px"
        color="ink"
        // The content injected via dangerouslySetInnerHTML is safe here specifically because
        // entry.content was sanitized server-side (allow-listed tags only, per
        // backend/src/modules/journal/sanitize.ts) before it was ever written to the database.
        dangerouslySetInnerHTML={{ __html: entry.content }}
      />
    </Card>
  );
}
