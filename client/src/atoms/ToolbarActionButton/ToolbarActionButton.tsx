/* eslint-disable prefer-arrow-callback, @typescript-eslint/no-shadow, react/jsx-props-no-spreading --
   `React.forwardRef` is named `function ToolbarActionButton` for React DevTools/component
   stack display, which arrow functions can't provide and which necessarily
   shadows the outer `ToolbarActionButton` binding; remaining props are forwarded via
   `{...props}` to the underlying `RippleButton`, which is the point of a thin
   wrapper like this one. */
import * as React from 'react';
import { RippleButton, type RippleButtonProps } from '../RippleButton/RippleButton.tsx';

export type ToolbarActionButtonProps = Omit<RippleButtonProps, 'active' | 'aria-pressed'>;

export const ToolbarActionButton = React.forwardRef<HTMLButtonElement, ToolbarActionButtonProps>(
  function ToolbarActionButton(props, ref) {
    return <RippleButton ref={ref} {...props} />;
  },
);
