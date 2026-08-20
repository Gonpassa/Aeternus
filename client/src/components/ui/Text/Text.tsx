/* eslint-disable prefer-arrow-callback, @typescript-eslint/no-shadow, react/jsx-props-no-spreading --
   Mirrors the Button.tsx wrapper pattern: `function Text` names the ref-forwarding
   component for DevTools, and remaining props are forwarded via `{...props}` to the
   underlying Chakra primitive. */
import * as React from 'react';
import { Text as ChakraText, useRecipe, type TextProps as ChakraTextProps } from '@chakra-ui/react';
import { textRecipe } from '../../../theme.ts';

export type TextVariant = 'default' | 'eyebrow' | 'muted' | 'error' | 'formError';

export interface TextProps extends Omit<ChakraTextProps, 'variant'> {
  variant?: TextVariant;
}

export const Text = React.forwardRef<HTMLParagraphElement, TextProps>(function Text(
  { variant = 'default', css, ...props },
  ref,
) {
  const recipe = useRecipe({ recipe: textRecipe });
  return <ChakraText ref={ref} css={[recipe({ variant }), css]} {...props} />;
});
