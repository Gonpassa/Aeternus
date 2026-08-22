import { useEffect, useRef, useState } from 'react';
import { MOOD_TAXONOMY } from '@nee3/shared-types';
import type { PrimaryMood, SpecificEmotion } from '@nee3/shared-types';
import { MOOD_LABEL, MOOD_RING_COLOR } from '../../moodColors.ts';
import { Stack } from '../../../../components/ui/Stack/Stack.tsx';
import { Text } from '../../../../components/ui/Text/Text.tsx';
import { Input } from '../../../../components/ui/Input/Input.tsx';
import { MoodSwatchButton } from './MoodSwatchButton.tsx';
import { EmotionPillButton } from './EmotionPillButton.tsx';

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
    primaryMood !== null && (MOOD_TAXONOMY[primaryMood]?.includes(specificEmotion ?? '') ?? false);
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
    <Stack as="fieldset" flexDirection="column" gap="2">
      <Text as="legend" variant="eyebrow" color="inkSoft">
        Mood
      </Text>
      <Stack wrap="wrap" gap="3" role="radiogroup" aria-label="Primary mood">
        {PRIMARY_MOODS.map((mood) => (
          <MoodSwatchButton
            key={mood}
            label={MOOD_LABEL[mood]}
            color={MOOD_RING_COLOR[mood]}
            selected={primaryMood === mood}
            onClick={() => handlePrimaryMoodClick(mood)}
          />
        ))}
      </Stack>
      {primaryMood && (
        <Stack wrap="wrap" align="center" gap="2" role="radiogroup" aria-label="Specific emotion">
          {(MOOD_TAXONOMY[primaryMood] ?? []).map((emotion) => (
            <EmotionPillButton
              key={emotion}
              label={emotion}
              selected={selectedFixed === emotion}
              onClick={() => handleFixedEmotionClick(emotion)}
            />
          ))}
          <Input
            type="text"
            placeholder="Custom"
            value={customText}
            onChange={(e) => handleCustomChange(e.target.value)}
            h="7"
            borderWidth="1px"
            borderColor="line"
            bg="paperCard"
            px="2"
            fontFamily="mono"
            fontSize="xs"
            w="auto"
          />
        </Stack>
      )}
    </Stack>
  );
}
