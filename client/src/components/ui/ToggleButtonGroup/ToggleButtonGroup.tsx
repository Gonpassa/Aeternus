/* eslint-disable prefer-arrow-callback, @typescript-eslint/no-shadow, react/jsx-props-no-spreading --
   `React.forwardRef` is named `function ToggleButtonGroupItem` for React DevTools/component
   stack display, which arrow functions can't provide and which necessarily
   shadows the outer `ToggleButtonGroupItem` binding; remaining props are forwarded via
   `{...props}` to the underlying `RippleButton`, which is the point of a thin
   wrapper like this one. */
import * as React from 'react';
import { RippleButton, type RippleButtonProps } from '../RippleButton/RippleButton.tsx';

interface ToggleButtonGroupContextValue {
  value: string | null;
  onChange: (value: string) => void;
}

const ToggleButtonGroupContext = React.createContext<ToggleButtonGroupContextValue | null>(null);

export interface ToggleButtonGroupProps extends Omit<
  React.HTMLAttributes<HTMLDivElement>,
  'onChange'
> {
  value: string | null;
  onChange: (value: string) => void;
  'aria-label': string;
}

function ToggleButtonGroup({ value, onChange, ...props }: ToggleButtonGroupProps) {
  const contextValue = React.useMemo(() => ({ value, onChange }), [value, onChange]);

  return (
    <ToggleButtonGroupContext.Provider value={contextValue}>
      <div role="radiogroup" {...props} />
    </ToggleButtonGroupContext.Provider>
  );
}

export interface ToggleButtonGroupItemProps extends Omit<
  RippleButtonProps,
  'active' | 'aria-pressed' | 'onClick'
> {
  value: string;
}

const ToggleButtonGroupItem = React.forwardRef<HTMLButtonElement, ToggleButtonGroupItemProps>(
  function ToggleButtonGroupItem({ value, ...props }, ref) {
    const context = React.useContext(ToggleButtonGroupContext);
    if (!context) {
      throw new Error('ToggleButtonGroupItem must be rendered inside a ToggleButtonGroup');
    }
    const selected = context.value === value;

    return (
      <RippleButton
        ref={ref}
        role="radio"
        active={selected}
        aria-checked={selected}
        onClick={() => context.onChange(value)}
        {...props}
      />
    );
  },
);

export { ToggleButtonGroup, ToggleButtonGroupItem };
