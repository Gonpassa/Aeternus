/* eslint-disable prefer-arrow-callback, @typescript-eslint/no-shadow, react/jsx-props-no-spreading --
   Mirrors the Button.tsx wrapper pattern: `function IndexCard` names the ref-forwarding
   component for DevTools, and remaining props are forwarded via `{...props}` to the
   underlying Chakra primitive. */
import { forwardRef, type ReactNode } from 'react';
import { Box, type BoxProps } from '@chakra-ui/react';
import { DieCutTab, type DieCutTabColor } from '../DieCutTab/DieCutTab.tsx';
import { Text } from '../Text/Text.tsx';

export type IndexCardAccent = DieCutTabColor;

export interface IndexCardProps extends BoxProps {
  // Both take a node rather than a string so the card can be written on as well as read: the
  // Notes capture card puts an input in the tab and another in the catalog number, which is
  // the whole point of writing a note on the object it becomes.
  label: ReactNode;
  catalogNumber: ReactNode;
  accent?: IndexCardAccent;
}

export const IndexCard = forwardRef<HTMLDivElement, IndexCardProps>(function IndexCard(
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
        <Text as="div" textStyle="body" color="ink">
          {children}
        </Text>
      )}
      <Text
        // A rendered catalog number is decoration - it repeats what the card already says in
        // readable form. A node the caller passes is the caller's own business, and hiding it
        // would put a focusable input behind aria-hidden.
        aria-hidden={typeof catalogNumber === 'string' ? 'true' : undefined}
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
