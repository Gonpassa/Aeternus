import { MOOD_TAXONOMY } from '@nee3/shared-types';
import type { PrimaryMood, SpecificEmotion } from '@nee3/shared-types';
import { MOOD_DOT_CLASS, MOOD_LABEL } from '../../moodColors.ts';

export interface MoodPickerProps {
  primaryMood: PrimaryMood | null;
  specificEmotion: SpecificEmotion | null;
  onChange: (value: { primaryMood: PrimaryMood; specificEmotion: SpecificEmotion | null }) => void;
}

const PRIMARY_MOODS = Object.keys(MOOD_TAXONOMY) as PrimaryMood[];

export function MoodPicker({ primaryMood, specificEmotion, onChange }: MoodPickerProps) {
  const isFixedEmotion =
    primaryMood !== null && MOOD_TAXONOMY[primaryMood].includes(specificEmotion ?? '');
  const customValue = specificEmotion && !isFixedEmotion ? specificEmotion : '';

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
            onClick={() => onChange({ primaryMood: mood, specificEmotion: null })}
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
              aria-checked={isFixedEmotion && specificEmotion === emotion}
              onClick={() => onChange({ primaryMood, specificEmotion: emotion })}
              className={`border px-2 py-1 font-mono text-xs uppercase ${
                isFixedEmotion && specificEmotion === emotion
                  ? 'border-moss text-moss'
                  : 'border-line'
              }`}
            >
              {emotion}
            </button>
          ))}
          <input
            type="text"
            placeholder="Custom"
            value={customValue}
            onChange={(e) => {
              const trimmed = e.target.value.trim();
              onChange({
                primaryMood,
                specificEmotion: trimmed.length > 0 ? e.target.value : null,
              });
            }}
            className="border border-line bg-paper-card px-2 py-1 font-mono text-xs normal-case"
          />
        </div>
      )}
    </fieldset>
  );
}
