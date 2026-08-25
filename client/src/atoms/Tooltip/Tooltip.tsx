/* eslint-disable prefer-arrow-callback, @typescript-eslint/no-shadow, react/jsx-props-no-spreading --
   `React.forwardRef` is named `function Tooltip` for React DevTools/component
   stack display, which arrow functions can't provide and which necessarily
   shadows the outer `Tooltip` binding; remaining props are forwarded via
   `{...props}` to the underlying Chakra primitive, which is the point of a
   thin wrapper like this one. */
import * as React from 'react';
import { Portal, Tooltip as ChakraTooltip } from '@chakra-ui/react';

export interface TooltipProps extends ChakraTooltip.RootProps {
  content: React.ReactNode;
  contentProps?: ChakraTooltip.ContentProps;
  portalled?: boolean;
}

export const Tooltip = React.forwardRef<HTMLDivElement, TooltipProps>(function Tooltip(
  { children, content, contentProps, portalled = true, ...props },
  ref,
) {
  return (
    <ChakraTooltip.Root openDelay={200} closeDelay={0} {...props}>
      <ChakraTooltip.Trigger asChild>{children}</ChakraTooltip.Trigger>
      <Portal disabled={!portalled}>
        <ChakraTooltip.Positioner>
          <ChakraTooltip.Content
            ref={ref}
            bg="ink"
            color="paper"
            textStyle="label"
            px="2"
            py="1"
            borderRadius="sm"
            {...contentProps}
          >
            {content}
          </ChakraTooltip.Content>
        </ChakraTooltip.Positioner>
      </Portal>
    </ChakraTooltip.Root>
  );
});
