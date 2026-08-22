/* eslint-disable prefer-arrow-callback, @typescript-eslint/no-shadow, react/jsx-props-no-spreading --
   Mirrors the Button.tsx wrapper pattern: `function Dot` names the ref-forwarding
   component for DevTools, and remaining props are forwarded via `{...props}` to the
   underlying Chakra primitive. */
import * as React from 'react';
import { Box, type BoxProps } from '@chakra-ui/react';

export type DotSize = '2' | '2.5';

export interface DotProps extends Omit<BoxProps, 'boxSize' | 'borderRadius' | 'bg'> {
  size?: DotSize;
  color: string;
}

export const Dot = React.forwardRef<HTMLDivElement, DotProps>(function Dot(
  { size = '2', color, ...props },
  ref,
) {
  return (
    <Box ref={ref} boxSize={size} borderRadius="full" bg={color} aria-hidden="true" {...props} />
  );
});
