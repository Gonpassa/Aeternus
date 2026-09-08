/* eslint-disable prefer-arrow-callback, @typescript-eslint/no-shadow, react/jsx-props-no-spreading --
   Mirrors the Button.tsx wrapper pattern: `function Textarea` names the ref-forwarding
   component for DevTools, and remaining props are forwarded via `{...props}` to the
   underlying Chakra primitive. */
import * as React from 'react';
import {
  Textarea as ChakraTextarea,
  type TextareaProps as ChakraTextareaProps,
} from '@chakra-ui/react';

export type TextareaProps = ChakraTextareaProps;

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  function Textarea(props, ref) {
    return (
      <ChakraTextarea
        ref={ref}
        bg="paper"
        borderWidth="1px"
        borderColor="line"
        borderRadius="md"
        textStyle="body"
        color="ink"
        _focusVisible={{ borderColor: 'moss', boxShadow: 'none' }}
        {...props}
      />
    );
  },
);
