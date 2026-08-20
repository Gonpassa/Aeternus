import styles from './MoodPicker.module.css';

export interface EmotionPillButtonProps {
  label: string;
  selected: boolean;
  onClick: () => void;
}

export function EmotionPillButton({ label, selected, onClick }: EmotionPillButtonProps) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      onClick={onClick}
      className={`${styles.pillButton} ${selected ? styles.pillButtonSelected : ''}`}
    >
      {label}
    </button>
  );
}
