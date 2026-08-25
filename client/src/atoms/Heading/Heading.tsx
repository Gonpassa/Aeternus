/* eslint-disable prefer-arrow-callback, @typescript-eslint/no-shadow, react/jsx-props-no-spreading --
   Mirrors the Button.tsx wrapper pattern: `function Heading` names the ref-forwarding
   component for DevTools, and remaining props are forwarded via `{...props}` to the
   underlying Chakra primitive. */
import * as React from 'react';
import {
  Heading as ChakraHeading,
  useRecipe,
  type HeadingProps as ChakraHeadingProps,
} from '@chakra-ui/react';
import { headingRecipe } from '../../theme.ts';

export type HeadingVariant = 'default' | 'page' | 'section' | 'card';

export interface HeadingProps extends Omit<ChakraHeadingProps, 'variant'> {
  variant?: HeadingVariant;
}

export const Heading = React.forwardRef<HTMLHeadingElement, HeadingProps>(function Heading(
  { variant = 'default', css, ...props },
  ref,
) {
  const recipe = useRecipe({ recipe: headingRecipe });
  return <ChakraHeading ref={ref} css={[recipe({ variant }), css]} {...props} />;
});
