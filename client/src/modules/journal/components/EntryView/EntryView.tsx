import { Box, Flex, Heading, Text } from '@chakra-ui/react';
import type { Entry } from '@nee3/shared-types';
import { MOOD_DOT_COLOR, MOOD_LABEL } from '../../moodColors.ts';

export interface EntryViewProps {
  entry: Entry;
}

export function EntryView({ entry }: EntryViewProps) {
  return (
    <Box
      as="article"
      mx="auto"
      maxW="2xl"
      borderLeftWidth="2px"
      borderLeftStyle="dashed"
      borderColor="line"
      pl="6"
    >
      <Text
        fontFamily="mono"
        fontSize="xs"
        textTransform="uppercase"
        letterSpacing="wide"
        color="inkSoft"
      >
        {entry.date}
      </Text>
      <Heading as="h1" fontFamily="heading" fontSize="3xl" fontWeight="semibold" color="ink">
        {entry.title}
      </Heading>
      <Flex
        mt="1"
        align="center"
        gap="1.5"
        fontFamily="mono"
        fontSize="xs"
        textTransform="uppercase"
        color="inkSoft"
      >
        <Box
          boxSize="2.5"
          borderRadius="full"
          bg={MOOD_DOT_COLOR[entry.primaryMood]}
          aria-hidden="true"
        />
        {MOOD_LABEL[entry.primaryMood]}
        {entry.specificEmotion && <> &middot; {entry.specificEmotion}</>}
      </Flex>
      <Box
        className="entry-content"
        mt="6"
        fontFamily="body"
        fontSize="17px"
        color="ink"
        // The content injected via dangerouslySetInnerHTML is safe here specifically because
        // entry.content was sanitized server-side (allow-listed tags only, per
        // backend/src/modules/journal/sanitize.ts) before it was ever written to the database.
        dangerouslySetInnerHTML={{ __html: entry.content }}
      />
    </Box>
  );
}
