/* eslint-disable prefer-arrow-callback, @typescript-eslint/no-shadow, react/jsx-props-no-spreading --
   Mirrors the Button.tsx wrapper pattern: `function LoadingGate` names the ref-forwarding
   component for DevTools, and remaining props are forwarded via `{...props}` to the
   underlying Chakra primitive. */
import * as React from 'react';
import { Stack, type StackProps } from '../Stack/Stack.tsx';
import { Spinner, type SpinnerSize } from '../Spinner/Spinner.tsx';

export interface LoadingGateProps extends Omit<StackProps, 'align' | 'justify'> {
  size?: SpinnerSize;
  label?: string;
}

export const LoadingGate = React.forwardRef<HTMLDivElement, LoadingGateProps>(function LoadingGate(
  { size = 'lg', label, minH = '50vh', ...props },
  ref,
) {
  return (
    <Stack ref={ref} align="center" justify="center" minH={minH} {...props}>
      <Spinner size={size} label={label} />
    </Stack>
  );
});
