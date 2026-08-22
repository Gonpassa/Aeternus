/* eslint-disable prefer-arrow-callback, @typescript-eslint/no-shadow, react/jsx-props-no-spreading --
   Mirrors the Button.tsx wrapper pattern: `function Stack` names the ref-forwarding
   component for DevTools, and remaining props are forwarded via `{...props}` to the
   underlying Chakra primitive. */
import * as React from 'react';
import { Flex, type FlexProps } from '@chakra-ui/react';

export type StackProps = FlexProps;

export const Stack = React.forwardRef<HTMLDivElement, StackProps>(function Stack(props, ref) {
  return <Flex ref={ref} {...props} />;
});
