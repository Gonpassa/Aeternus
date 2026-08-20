/* eslint-disable prefer-arrow-callback, @typescript-eslint/no-shadow, react/jsx-props-no-spreading --
   Mirrors the Button.tsx wrapper pattern: `function Card` names the ref-forwarding
   component for DevTools, and remaining props are forwarded via `{...props}` to the
   underlying Chakra primitive. */
import * as React from 'react';
import { Box, type BoxProps } from '@chakra-ui/react';

export type CardVariant = 'default' | 'railed';
export type CardPadding = 'none' | 'sm' | 'md';

export interface CardProps extends Omit<BoxProps, 'padding'> {
  variant?: CardVariant;
  padding?: CardPadding;
}

const paddingValue: Record<CardPadding, string> = {
  none: '0',
  sm: '3',
  md: '4',
};

export const Card = React.forwardRef<HTMLDivElement, CardProps>(function Card(
  { variant = 'default', padding = 'md', ...props },
  ref,
) {
  if (variant === 'railed') {
    return (
      <Box
        ref={ref}
        borderLeftWidth="2px"
        borderLeftStyle="dashed"
        borderColor="line"
        pl="10"
        {...props}
      />
    );
  }

  return (
    <Box
      ref={ref}
      borderWidth="1px"
      borderColor="line"
      bg="paperCard"
      p={paddingValue[padding]}
      {...props}
    />
  );
});
