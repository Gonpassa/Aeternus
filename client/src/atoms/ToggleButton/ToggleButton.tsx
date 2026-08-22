/* eslint-disable prefer-arrow-callback, @typescript-eslint/no-shadow, react/jsx-props-no-spreading --
   `React.forwardRef` is named `function ToggleButton` for React DevTools/component
   stack display, which arrow functions can't provide and which necessarily
   shadows the outer `ToggleButton` binding; remaining props are forwarded via
   `{...props}` to the underlying `RippleButton`, which is the point of a thin
   wrapper like this one. */
import * as React from 'react';
import { RippleButton, type RippleButtonProps } from '../RippleButton/RippleButton.tsx';

export interface ToggleButtonProps extends Omit<RippleButtonProps, 'active' | 'aria-pressed'> {
  pressed: boolean;
  onPressedChange: (pressed: boolean) => void;
}

export const ToggleButton = React.forwardRef<HTMLButtonElement, ToggleButtonProps>(
  function ToggleButton({ pressed, onPressedChange, onClick, ...props }, ref) {
    const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
      onClick?.(event);
      onPressedChange(!pressed);
    };

    return (
      <RippleButton
        ref={ref}
        active={pressed}
        aria-pressed={pressed}
        onClick={handleClick}
        {...props}
      />
    );
  },
);
