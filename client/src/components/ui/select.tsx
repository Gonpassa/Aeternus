/* eslint-disable prefer-arrow-callback, @typescript-eslint/no-shadow, react/jsx-props-no-spreading --
   `React.forwardRef` is named `function SelectTrigger`/`function SelectContent` for React
   DevTools/component stack display, which arrow functions can't provide and which
   necessarily shadows the outer bindings; remaining props are forwarded via `{...props}`
   to the underlying Chakra primitives, which is the point of a thin wrapper like this one. */
import * as React from 'react';
import { Select as ChakraSelect, Portal, createListCollection } from '@chakra-ui/react';

export { createListCollection };

function Select(props: ChakraSelect.RootProps) {
  return <ChakraSelect.Root {...props} />;
}

const SelectTrigger = React.forwardRef<HTMLDivElement, ChakraSelect.ControlProps>(
  function SelectTrigger({ children, ...props }, ref) {
    return (
      <ChakraSelect.Control ref={ref} {...props}>
        <ChakraSelect.Trigger
          borderWidth="1px"
          borderColor="line"
          bg="transparent"
          px="3"
          py="2"
          fontFamily="mono"
          fontSize="xs"
          textTransform="uppercase"
        >
          {children}
        </ChakraSelect.Trigger>
      </ChakraSelect.Control>
    );
  },
);

function SelectValue(props: ChakraSelect.ValueTextProps) {
  return <ChakraSelect.ValueText {...props} />;
}

const SelectContent = React.forwardRef<HTMLDivElement, ChakraSelect.ContentProps>(
  function SelectContent(props, ref) {
    return (
      <Portal>
        <ChakraSelect.Positioner>
          <ChakraSelect.Content
            ref={ref}
            bg="paperCard"
            borderWidth="1px"
            borderColor="line"
            borderRadius="md"
            boxShadow="md"
            p="1"
            {...props}
          />
        </ChakraSelect.Positioner>
      </Portal>
    );
  },
);

function SelectItem({ item, children, ...props }: ChakraSelect.ItemProps) {
  return (
    <ChakraSelect.Item
      item={item}
      px="2"
      py="1.5"
      fontFamily="mono"
      fontSize="xs"
      color="ink"
      _highlighted={{ bg: 'line/60' }}
      {...props}
    >
      <ChakraSelect.ItemText>{children}</ChakraSelect.ItemText>
      <ChakraSelect.ItemIndicator />
    </ChakraSelect.Item>
  );
}

export { Select, SelectTrigger, SelectValue, SelectContent, SelectItem };
