/* eslint-disable prefer-arrow-callback, @typescript-eslint/no-shadow, react/jsx-props-no-spreading --
   Mirrors the Button.tsx wrapper pattern: `function Spinner` names the ref-forwarding
   component for DevTools, and remaining props are forwarded via `{...props}` to the
   underlying Chakra primitive. */
import * as React from 'react';
import { Box, type BoxProps } from '@chakra-ui/react';
import styles from './Spinner.module.css';

export type SpinnerSize = 'xs' | 'sm' | 'default' | 'lg';

const SIZE_PX: Record<SpinnerSize, number> = {
  xs: 16,
  sm: 20,
  default: 32,
  lg: 48,
};

export interface SpinnerProps extends Omit<BoxProps, 'boxSize'> {
  size?: SpinnerSize;
  thickness?: number;
  label?: string;
}

export const Spinner = React.forwardRef<HTMLDivElement, SpinnerProps>(function Spinner(
  { size = 'default', color = 'accent', thickness = 3.6, label = 'Loading', className, ...props },
  ref,
) {
  const px = SIZE_PX[size];

  return (
    <Box
      ref={ref}
      display="inline-flex"
      boxSize={`${px}px`}
      color={color}
      className={[styles.root, className].filter(Boolean).join(' ')}
      role="status"
      aria-label={label}
      {...props}
    >
      <svg className={styles.svg} viewBox="22 22 44 44">
        <circle
          className={styles.circle}
          cx="44"
          cy="44"
          r="20.2"
          fill="none"
          strokeWidth={thickness}
        />
      </svg>
    </Box>
  );
});
