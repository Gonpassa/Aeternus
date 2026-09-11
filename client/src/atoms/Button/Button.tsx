/* eslint-disable prefer-arrow-callback, @typescript-eslint/no-shadow, react/jsx-props-no-spreading --
   `forwardRef` is named `function Button` for React DevTools/component
   stack display, which arrow functions can't provide and which necessarily
   shadows the outer `Button` binding; remaining props are forwarded via
   `{...props}` to the underlying Chakra primitive, which is the point of a
   thin wrapper like this one. */
import { forwardRef, type CSSProperties } from 'react';
import { Button as ChakraButton, type ButtonProps as ChakraButtonProps } from '@chakra-ui/react';
import { useRipple } from '../../hooks/useRipple.ts';
import styles from './Button.module.css';

export type ButtonVariant = 'default' | 'destructive' | 'outline' | 'ghost' | 'link';
export type ButtonSize = 'default' | 'xs' | 'sm' | 'lg';

export interface ButtonProps extends Omit<ChakraButtonProps, 'variant' | 'size'> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: ChakraButtonProps['loading'];
  loadingText?: ChakraButtonProps['loadingText'];
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = 'default', size = 'default', onClick, className, children, ...props },
  ref,
) {
  const { ripple, handleClick, clearRipple } = useRipple<HTMLButtonElement>(onClick);

  return (
    <ChakraButton
      ref={ref}
      variant={variant as ChakraButtonProps['variant']}
      size={size as ChakraButtonProps['size']}
      className={[styles.button, className].filter(Boolean).join(' ')}
      onClick={handleClick}
      {...props}
    >
      {children}
      {ripple && (
        <span
          key={ripple.key}
          className={styles.ripple}
          style={{ left: ripple.x, top: ripple.y } as CSSProperties}
          onAnimationEnd={clearRipple}
          aria-hidden="true"
        />
      )}
    </ChakraButton>
  );
});
