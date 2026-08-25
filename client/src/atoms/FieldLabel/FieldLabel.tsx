/* eslint-disable prefer-arrow-callback, @typescript-eslint/no-shadow, react/jsx-props-no-spreading --
   Mirrors the Button.tsx wrapper pattern: `function FieldLabel` names the
   ref-forwarding component for DevTools, and remaining props are forwarded via
   `{...props}` to the underlying Chakra primitive. */
import * as React from 'react';
import { chakra, type HTMLChakraProps } from '@chakra-ui/react';

export interface FieldLabelProps extends HTMLChakraProps<'label'> {
  eyebrow?: boolean;
}

const eyebrowStyle = {
  textStyle: 'label',
} as const;

export const FieldLabel = React.forwardRef<HTMLLabelElement, FieldLabelProps>(function FieldLabel(
  { eyebrow = false, ...props },
  ref,
) {
  return (
    <chakra.label
      ref={ref}
      display="flex"
      flexDirection="column"
      gap="1"
      {...(eyebrow ? eyebrowStyle : undefined)}
      {...props}
    />
  );
});
