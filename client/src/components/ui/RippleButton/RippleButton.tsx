/* eslint-disable prefer-arrow-callback, @typescript-eslint/no-shadow, react/jsx-props-no-spreading --
   `React.forwardRef` is named `function RippleButton` for React DevTools/component
   stack display, which arrow functions can't provide and which necessarily
   shadows the outer `RippleButton` binding; remaining props are forwarded via
   `{...props}` to the underlying `<button>`, which is the point of a thin
   wrapper like this one. */
import * as React from 'react';
import styles from './RippleButton.module.css';

export interface RippleButtonProps extends Omit<
  React.ButtonHTMLAttributes<HTMLButtonElement>,
  'className'
> {
  active?: boolean;
}

interface Ripple {
  key: number;
  x: number;
  y: number;
}

export const RippleButton = React.forwardRef<HTMLButtonElement, RippleButtonProps>(
  function RippleButton({ active = false, onClick, children, ...props }, ref) {
    const [ripple, setRipple] = React.useState<Ripple | null>(null);

    const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
      const rect = event.currentTarget.getBoundingClientRect();
      setRipple({
        key: Date.now(),
        x: event.clientX - rect.left,
        y: event.clientY - rect.top,
      });
      onClick?.(event);
    };

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
            onAnimationEnd={() => setRipple(null)}
            aria-hidden="true"
          />
        )}
      </button>
    );
  },
);
