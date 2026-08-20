import type { CSSProperties } from 'react';
import { Tooltip } from '../../../../components/ui/Tooltip/Tooltip.tsx';
import { VisuallyHidden } from '../../../../components/ui/VisuallyHidden/VisuallyHidden.tsx';
import styles from './MoodPicker.module.css';

export interface MoodSwatchButtonProps {
  label: string;
  color: string;
  selected: boolean;
  onClick: () => void;
}

export function MoodSwatchButton({ label, color, selected, onClick }: MoodSwatchButtonProps) {
  return (
    <Tooltip content={label}>
      <button
        type="button"
        role="radio"
        aria-checked={selected}
        onClick={onClick}
        className={`${styles.swatchButton} ${selected ? styles.swatchButtonSelected : ''}`}
        style={{ '--swatch-color': color } as CSSProperties}
      >
        <span
          className={`${styles.swatchDot} ${selected ? styles.swatchDotSelected : ''}`}
          aria-hidden="true"
        />
        <VisuallyHidden>{label}</VisuallyHidden>
      </button>
    </Tooltip>
  );
}
