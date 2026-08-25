/* eslint-disable prefer-arrow-callback, @typescript-eslint/no-shadow, react/jsx-props-no-spreading --
   Mirrors the Button.tsx wrapper pattern: `function IndexCard` names the ref-forwarding
   component for DevTools, and remaining props are forwarded via `{...props}` to the
   underlying Chakra primitive. */
import * as React from 'react';
import { Box, type BoxProps } from '@chakra-ui/react';
import { DieCutTab, type DieCutTabColor } from '../DieCutTab/DieCutTab.tsx';
import { Text } from '../Text/Text.tsx';

export type IndexCardAccent = DieCutTabColor;

export interface IndexCardProps extends BoxProps {
  label: string;
  catalogNumber: string;
  accent?: IndexCardAccent;
}

export const IndexCard = React.forwardRef<HTMLDivElement, IndexCardProps>(function IndexCard(
  { label, catalogNumber, accent = 'rust', children, ...props },
  ref,
) {
  return (
    <Box
      ref={ref}
      position="relative"
      bg="paperCard"
      borderWidth="1px"
      borderColor="line"
      pt="5"
      px="5"
      pb="5"
      {...props}
    >
      <DieCutTab position="absolute" top="-3.5" left="8" color={accent}>
        {label}
      </DieCutTab>

      {children && (
        <Text textStyle="body" color="ink">
          {children}
        </Text>
      )}
      <Text
        aria-hidden="true"
        position="absolute"
        bottom="3"
        right="4"
        fontFamily="mono"
        fontSize="0.75rem"
        color="inkSoft"
      >
        {catalogNumber}
      </Text>
    </Box>
  );
});
