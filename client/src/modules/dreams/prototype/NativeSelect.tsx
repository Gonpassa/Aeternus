/** PROTOTYPE — throwaway code, never ship. Minimal styled native select. */
import type { ChangeEvent, ReactNode } from 'react';

export interface NativeSelectProps {
  value: string;
  onChange: (value: string) => void;
  children: ReactNode;
  fullWidth?: boolean;
}

export function NativeSelect({ value, onChange, children, fullWidth }: NativeSelectProps) {
  return (
    <select
      value={value}
      onChange={(e: ChangeEvent<HTMLSelectElement>) => onChange(e.target.value)}
      style={{
        background: '#F3EEE2',
        border: '1px solid #D8CFB8',
        borderRadius: '4px',
        padding: '4px 8px',
        fontFamily: "'IBM Plex Mono', ui-monospace, monospace",
        fontSize: '0.75rem',
        textTransform: 'uppercase',
        width: fullWidth ? '100%' : undefined,
      }}
    >
      {children}
    </select>
  );
}
