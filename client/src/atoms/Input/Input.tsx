/* eslint-disable prefer-arrow-callback, @typescript-eslint/no-shadow, react/jsx-props-no-spreading --
   Mirrors the Button.tsx wrapper pattern: `function Input` names the ref-forwarding
   component for DevTools, and remaining props are forwarded via `{...props}` to the
   underlying Chakra primitive. */
import * as React from 'react';
import {
  Input as ChakraInput,
  useRecipe,
  type InputProps as ChakraInputProps,
} from '@chakra-ui/react';
import { inputRecipe } from '../../theme.ts';

export type InputVariant = 'default' | 'title';

export interface InputProps extends Omit<ChakraInputProps, 'variant'> {
  variant?: InputVariant;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(function Input(
  { variant = 'default', css, ...props },
  ref,
) {
  const recipe = useRecipe({ recipe: inputRecipe });
  return <ChakraInput ref={ref} css={[recipe({ variant }), css]} {...props} />;
});
