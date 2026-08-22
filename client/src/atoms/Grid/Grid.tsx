/* eslint-disable prefer-arrow-callback, @typescript-eslint/no-shadow, react/jsx-props-no-spreading --
   Mirrors the Button.tsx wrapper pattern: `function Grid`/`function GridItem` name the
   ref-forwarding components for DevTools, and remaining props are forwarded via
   `{...props}` to the underlying Chakra primitive. */
import * as React from 'react';
import {
  Grid as ChakraGrid,
  GridItem as ChakraGridItem,
  type GridProps as ChakraGridProps,
  type GridItemProps as ChakraGridItemProps,
} from '@chakra-ui/react';

export type GridProps = ChakraGridProps;

export const Grid = React.forwardRef<HTMLDivElement, GridProps>(function Grid(props, ref) {
  return <ChakraGrid ref={ref} {...props} />;
});

export type GridItemProps = ChakraGridItemProps;

export const GridItem = React.forwardRef<HTMLDivElement, GridItemProps>(
  function GridItem(props, ref) {
    return <ChakraGridItem ref={ref} {...props} />;
  },
);
