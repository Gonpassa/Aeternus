/* eslint-disable prefer-arrow-callback, @typescript-eslint/no-shadow, react/jsx-props-no-spreading --
   Mirrors the Button.tsx wrapper pattern: `function DieCutTab` names the ref-forwarding
   component for DevTools, and remaining props are forwarded via `{...props}` to the
   underlying Chakra primitive. */
import * as React from 'react';
import { Box, type BoxProps } from '@chakra-ui/react';

export type DieCutTabColor = 'rust' | 'moss' | 'inkBlue';

export interface DieCutTabProps extends Omit<BoxProps, 'color'> {
  color?: DieCutTabColor;
}

export const DieCutTab = React.forwardRef<HTMLDivElement, DieCutTabProps>(function DieCutTab(
  { color = 'rust', ...props },
  ref,
) {
  return (
    <Box
      ref={ref}
      bg={color}
      color="paper"
      px="3"
      py="1"
      fontFamily="mono"
      fontSize="2xs"
      fontWeight="medium"
      textTransform="uppercase"
      letterSpacing="0.06em"
      borderTopRadius="sm"
      {...props}
    />
  );
});
