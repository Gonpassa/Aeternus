/* eslint-disable prefer-arrow-callback, @typescript-eslint/no-shadow, react/jsx-props-no-spreading --
   `React.forwardRef` is named `function Button` for React DevTools/component
   stack display, which arrow functions can't provide and which necessarily
   shadows the outer `Button` binding; remaining props are forwarded via
   `{...props}` to the underlying Chakra primitive, which is the point of a
   thin wrapper like this one. */
import * as React from 'react';
import { Button as ChakraButton, type ButtonProps as ChakraButtonProps } from '@chakra-ui/react';

export type ButtonVariant = 'default' | 'destructive' | 'outline' | 'ghost' | 'link';
export type ButtonSize = 'default' | 'xs' | 'sm' | 'lg';

export interface ButtonProps extends Omit<ChakraButtonProps, 'variant' | 'size'> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: ChakraButtonProps['loading'];
  loadingText?: ChakraButtonProps['loadingText'];
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = 'default', size = 'default', ...props },
  ref,
) {
  return (
    <ChakraButton
      ref={ref}
      variant={variant as ChakraButtonProps['variant']}
      size={size as ChakraButtonProps['size']}
      {...props}
    />
  );
});
