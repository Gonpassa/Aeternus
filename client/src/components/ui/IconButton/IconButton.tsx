/* eslint-disable prefer-arrow-callback, @typescript-eslint/no-shadow, react/jsx-props-no-spreading --
   `React.forwardRef` is named `function IconButton` for React DevTools/component
   stack display, which arrow functions can't provide and which necessarily
   shadows the outer `IconButton` binding; remaining props are forwarded via
   `{...props}` to the underlying Chakra primitive, which is the point of a
   thin wrapper like this one. */
import * as React from 'react';
import type { LucideIcon } from 'lucide-react';
import {
  IconButton as ChakraIconButton,
  type ButtonProps as ChakraButtonProps,
} from '@chakra-ui/react';
import type { ButtonVariant } from '../Button/Button.tsx';

export type IconButtonSize = 'default' | 'xs' | 'sm' | 'lg';

const SQUARE_DIMENSION: Record<IconButtonSize, string> = {
  xs: '6',
  sm: '8',
  default: '9',
  lg: '10',
};

const ICON_PIXEL_SIZE: Record<IconButtonSize, number> = {
  xs: 12,
  sm: 16,
  default: 18,
  lg: 20,
};

export interface IconButtonProps extends Omit<ChakraButtonProps, 'variant' | 'size'> {
  icon: LucideIcon;
  'aria-label': string;
  variant?: ButtonVariant;
  size?: IconButtonSize;
}

export const IconButton = React.forwardRef<HTMLButtonElement, IconButtonProps>(function IconButton(
  { icon: Icon, variant = 'default', size = 'default', ...props },
  ref,
) {
  const dimension = SQUARE_DIMENSION[size];

  return (
    <ChakraIconButton
      ref={ref}
      variant={variant as ChakraButtonProps['variant']}
      h={dimension}
      w={dimension}
      px="0"
      {...props}
    >
      <Icon size={ICON_PIXEL_SIZE[size]} />
    </ChakraIconButton>
  );
});
