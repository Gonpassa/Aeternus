import { useEffect, useRef, useState } from 'react';
import { MOOD_TAXONOMY } from '@nee3/shared-types';
import type { PrimaryMood, SpecificEmotion } from '@nee3/shared-types';
import { MOOD_DOT_CLASS, MOOD_LABEL } from '../../moodColors.ts';

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
    <fieldset className="flex flex-col gap-2">
      <legend className="font-mono text-xs uppercase tracking-wide text-ink-soft">Mood</legend>
      <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Primary mood">
        {PRIMARY_MOODS.map((mood) => (
          <button
            key={mood}
            type="button"
            role="radio"
            aria-checked={primaryMood === mood}
            onClick={() => handlePrimaryMoodClick(mood)}
            className={`flex items-center gap-1.5 border px-2 py-1 font-mono text-xs uppercase ${
              primaryMood === mood ? 'border-ink-blue' : 'border-line'
            }`}
          >
            <span
              className={`h-2.5 w-2.5 rounded-full ${MOOD_DOT_CLASS[mood]}`}
              aria-hidden="true"
            />
            {MOOD_LABEL[mood]}
          </button>
        ))}
      </div>
      {primaryMood && (
        <div
          className="flex flex-wrap items-center gap-2"
          role="radiogroup"
          aria-label="Specific emotion"
        >
          {MOOD_TAXONOMY[primaryMood].map((emotion) => (
            <button
              key={emotion}
              type="button"
              role="radio"
              aria-checked={selectedFixed === emotion}
              onClick={() => handleFixedEmotionClick(emotion)}
              className={`border px-2 py-1 font-mono text-xs uppercase ${
                selectedFixed === emotion ? 'border-moss text-moss' : 'border-line'
              }`}
            >
              {emotion}
            </button>
          ))}
          <input
            type="text"
            placeholder="Custom"
            value={customText}
            onChange={(e) => handleCustomChange(e.target.value)}
            className="border border-line bg-paper-card px-2 py-1 font-mono text-xs normal-case"
          />
        </div>
      )}
    </fieldset>
  );
}
