import { useEffect, useRef, useState } from 'react';
import { Box, chakra, Flex, Input, Text } from '@chakra-ui/react';
import { MOOD_TAXONOMY } from '@nee3/shared-types';
import type { PrimaryMood, SpecificEmotion } from '@nee3/shared-types';
import { MOOD_DOT_COLOR, MOOD_LABEL } from '../../moodColors.ts';

export interface MoodPickerProps {
  primaryMood: PrimaryMood | null;
  specificEmotion: SpecificEmotion | null;
  onChange: (value: { primaryMood: PrimaryMood; specificEmotion: SpecificEmotion | null }) => void;
}

const PRIMARY_MOODS = Object.keys(MOOD_TAXONOMY) as PrimaryMood[];

interface LocalMoodState {
  selectedFixed: string | null;
  customText: string;
}

function deriveLocalState(
  primaryMood: PrimaryMood | null,
  specificEmotion: SpecificEmotion | null,
): LocalMoodState {
  const isFixed =
    primaryMood !== null && MOOD_TAXONOMY[primaryMood].includes(specificEmotion ?? '');
  return {
    selectedFixed: isFixed ? specificEmotion : null,
    customText: !isFixed && specificEmotion ? specificEmotion : '',
  };
}

export function MoodPicker({ primaryMood, specificEmotion, onChange }: MoodPickerProps) {
  const [{ selectedFixed, customText }, setLocalState] = useState<LocalMoodState>(() =>
    deriveLocalState(primaryMood, specificEmotion),
  );

  // Tracks the last { primaryMood, specificEmotion } this component itself emitted via
  // onChange, so we can tell an external prop change (e.g. loading a different entry, or
  // the EntryForm collision-lookup prefill) apart from the parent simply echoing back what
  // we just told it. Only external changes should resync local display state from props;
  // otherwise a custom-typed value that happens to match a fixed suggestion (e.g. "content")
  // would self-clear the moment the parent's controlled prop catches up.
  const lastEmitted = useRef<{
    primaryMood: PrimaryMood | null;
    specificEmotion: SpecificEmotion | null;
  }>({
    primaryMood,
    specificEmotion,
  });

  useEffect(() => {
    const last = lastEmitted.current;
    const isExternalChange =
      last.primaryMood !== primaryMood || last.specificEmotion !== specificEmotion;
    if (!isExternalChange) return;
    lastEmitted.current = { primaryMood, specificEmotion };
    setLocalState(deriveLocalState(primaryMood, specificEmotion));
  }, [primaryMood, specificEmotion]);

  const emit = (nextPrimaryMood: PrimaryMood, nextSpecificEmotion: SpecificEmotion | null) => {
    lastEmitted.current = { primaryMood: nextPrimaryMood, specificEmotion: nextSpecificEmotion };
    onChange({ primaryMood: nextPrimaryMood, specificEmotion: nextSpecificEmotion });
  };

  const handlePrimaryMoodClick = (mood: PrimaryMood) => {
    setLocalState({ selectedFixed: null, customText: '' });
    emit(mood, null);
  };

  const handleFixedEmotionClick = (emotion: string) => {
    if (!primaryMood) return;
    setLocalState({ selectedFixed: emotion, customText: '' });
    emit(primaryMood, emotion);
  };

  const handleCustomChange = (raw: string) => {
    if (!primaryMood) return;
    setLocalState({ selectedFixed: null, customText: raw });
    const trimmed = raw.trim();
    emit(primaryMood, trimmed.length > 0 ? raw : null);
  };

  return (
    <Box as="fieldset" display="flex" flexDirection="column" gap="2">
      <Text
        as="legend"
        fontFamily="mono"
        fontSize="xs"
        textTransform="uppercase"
        letterSpacing="wide"
        color="inkSoft"
      >
        Mood
      </Text>
      <Flex wrap="wrap" gap="3" role="radiogroup" aria-label="Primary mood">
        {PRIMARY_MOODS.map((mood) => (
          <chakra.button
            key={mood}
            type="button"
            role="radio"
            aria-checked={primaryMood === mood}
            title={MOOD_LABEL[mood]}
            onClick={() => handlePrimaryMoodClick(mood)}
            position="relative"
            boxSize="7"
            p="0"
            borderRadius="full"
            borderWidth="1.5px"
            borderColor={primaryMood === mood ? MOOD_DOT_COLOR[mood] : 'line'}
            bg="paperCard"
          >
            <Box
              position="absolute"
              inset="4px"
              borderRadius="full"
              bg={MOOD_DOT_COLOR[mood]}
              opacity={primaryMood === mood ? 1 : 0.25}
              aria-hidden="true"
            />
            <chakra.span
              position="absolute"
              w="1px"
              h="1px"
              overflow="hidden"
              clipPath="inset(50%)"
            >
              {MOOD_LABEL[mood]}
            </chakra.span>
          </chakra.button>
        ))}
      </Flex>
      {primaryMood && (
        <Flex wrap="wrap" align="center" gap="2" role="radiogroup" aria-label="Specific emotion">
          {MOOD_TAXONOMY[primaryMood].map((emotion) => (
            <chakra.button
              key={emotion}
              type="button"
              role="radio"
              aria-checked={selectedFixed === emotion}
              onClick={() => handleFixedEmotionClick(emotion)}
              borderWidth="1px"
              borderColor={selectedFixed === emotion ? 'moss' : 'line'}
              color={selectedFixed === emotion ? 'moss' : undefined}
              px="2"
              py="1"
              fontFamily="mono"
              fontSize="xs"
              textTransform="uppercase"
            >
              {emotion}
            </chakra.button>
          ))}
          <Input
            type="text"
            placeholder="Custom"
            value={customText}
            onChange={(e) => handleCustomChange(e.target.value)}
            borderWidth="1px"
            borderColor="line"
            bg="paperCard"
            px="2"
            py="1"
            fontFamily="mono"
            fontSize="xs"
            w="auto"
          />
        </Flex>
      )}
    </Box>
  );
}
