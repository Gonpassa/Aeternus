/* eslint-disable prefer-arrow-callback, @typescript-eslint/no-shadow, react/jsx-props-no-spreading --
   `React.forwardRef` is named `function RippleButton` for React DevTools/component
   stack display, which arrow functions can't provide and which necessarily
   shadows the outer `RippleButton` binding; remaining props are forwarded via
   `{...props}` to the underlying `<button>`, which is the point of a thin
   wrapper like this one. */
import * as React from 'react';
import { useRipple } from '../../hooks/useRipple.ts';
import styles from './RippleButton.module.css';

export interface RippleButtonProps extends Omit<
  React.ButtonHTMLAttributes<HTMLButtonElement>,
  'className'
> {
  active?: boolean;
}

export const RippleButton = React.forwardRef<HTMLButtonElement, RippleButtonProps>(
  function RippleButton({ active = false, onClick, children, ...props }, ref) {
    const { ripple, handleClick, clearRipple } = useRipple<HTMLButtonElement>(onClick);

    return (
      <button
        ref={ref}
        type="button"
        {...props}
        className={`${styles.button} ${active ? styles.buttonActive : ''}`}
        onClick={handleClick}
      >
        {children}
        {ripple && (
          <span
            key={ripple.key}
            className={styles.ripple}
            style={{ left: ripple.x, top: ripple.y } as React.CSSProperties}
            onAnimationEnd={clearRipple}
            aria-hidden="true"
          />
        )}
      </button>
    );
  },
);
