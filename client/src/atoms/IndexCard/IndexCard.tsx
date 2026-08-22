/* eslint-disable prefer-arrow-callback, @typescript-eslint/no-shadow, react/jsx-props-no-spreading --
   Mirrors the Button.tsx wrapper pattern: `function IndexCard` names the ref-forwarding
   component for DevTools, and remaining props are forwarded via `{...props}` to the
   underlying Chakra primitive. */
import * as React from 'react';
import { Box, type BoxProps } from '@chakra-ui/react';
import { Heading } from '../Heading/Heading.tsx';
import { Text } from '../Text/Text.tsx';

export type IndexCardAccent = 'rust' | 'moss';

export interface IndexCardProps extends Omit<BoxProps, 'title'> {
  title: React.ReactNode;
  label: string;
  catalogNumber: string;
  accent?: IndexCardAccent;
}

export const IndexCard = React.forwardRef<HTMLDivElement, IndexCardProps>(function IndexCard(
  { title, label, catalogNumber, accent = 'rust', children, ...props },
  ref,
) {
  return (
    <Box
      ref={ref}
      position="relative"
      bg="paperCard"
      borderWidth="1px"
      borderColor="line"
      pt="8"
      px="5"
      pb="5"
      {...props}
    >
      <Box
        aria-hidden="true"
        position="absolute"
        top="3"
        left="3"
        w="2.5"
        h="2.5"
        borderRadius="full"
        bg="paper"
        borderWidth="1px"
        borderColor="line"
      />
      <Box
        position="absolute"
        top="-3.5"
        left="8"
        bg={accent}
        color="paper"
        px="3"
        py="1"
        fontFamily="mono"
        fontSize="2xs"
        fontWeight="medium"
        textTransform="uppercase"
        letterSpacing="0.06em"
        borderTopRadius="sm"
      >
        {label}
      </Box>
      <Heading
        as="h3"
        fontFamily="heading"
        fontSize="lg"
        fontWeight="medium"
        color="ink"
        mb={children ? '2' : '0'}
      >
        {title}
      </Heading>
      {children && (
        <Text fontFamily="body" fontSize="md" color="ink">
          {children}
        </Text>
      )}
      <Text
        aria-hidden="true"
        position="absolute"
        bottom="3"
        right="4"
        fontFamily="mono"
        fontSize="2xs"
        color="inkSoft"
      >
        {catalogNumber}
      </Text>
    </Box>
  );
});
