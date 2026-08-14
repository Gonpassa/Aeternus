/* eslint-disable prefer-arrow-callback, @typescript-eslint/no-shadow, react/jsx-props-no-spreading --
   `React.forwardRef` is named `function PopoverContent` for React DevTools/component
   stack display, which arrow functions can't provide and which necessarily
   shadows the outer `PopoverContent` binding; remaining props are forwarded via
   `{...props}` to the underlying Chakra primitives, which is the point of a
   thin wrapper like this one. */
import * as React from 'react';
import { Popover as ChakraPopover, Portal } from '@chakra-ui/react';

function Popover(props: ChakraPopover.RootProps) {
  return <ChakraPopover.Root {...props} />;
}

function PopoverTrigger(props: ChakraPopover.TriggerProps) {
  return <ChakraPopover.Trigger {...props} />;
}

function PopoverAnchor(props: ChakraPopover.AnchorProps) {
  return <ChakraPopover.Anchor {...props} />;
}

const PopoverContent = React.forwardRef<HTMLDivElement, ChakraPopover.ContentProps>(
  function PopoverContent(props, ref) {
    return (
      <Portal>
        <ChakraPopover.Positioner>
          <ChakraPopover.Content
            ref={ref}
            bg="paperCard"
            borderWidth="1px"
            borderColor="line"
            borderRadius="md"
            p="4"
            boxShadow="md"
            {...props}
          />
        </ChakraPopover.Positioner>
      </Portal>
    );
  },
);

export { Popover, PopoverTrigger, PopoverContent, PopoverAnchor };
