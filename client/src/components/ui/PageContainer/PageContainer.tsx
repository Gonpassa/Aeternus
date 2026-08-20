/* eslint-disable prefer-arrow-callback, @typescript-eslint/no-shadow, react/jsx-props-no-spreading --
   Mirrors the Button.tsx wrapper pattern: `function PageContainer` names the
   ref-forwarding component for DevTools, and remaining props are forwarded via
   `{...props}` to the underlying Chakra primitive. */
import * as React from 'react';
import { Box, type BoxProps } from '@chakra-ui/react';

export type PageContainerMaxW = 'sm' | '2xl';

export interface PageContainerProps extends Omit<BoxProps, 'maxW' | 'mx' | 'p'> {
  maxW?: PageContainerMaxW;
  centered?: boolean;
}

export const PageContainer = React.forwardRef<HTMLDivElement, PageContainerProps>(
  function PageContainer({ maxW = '2xl', centered = false, ...props }, ref) {
    return <Box ref={ref} maxW={maxW} mx={centered ? 'auto' : undefined} p="4" {...props} />;
  },
);
