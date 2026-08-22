/* eslint-disable prefer-arrow-callback, @typescript-eslint/no-shadow, react/jsx-props-no-spreading --
   Mirrors the Button.tsx wrapper pattern: `function Prose` names the ref-forwarding
   component for DevTools, and remaining props are forwarded via `{...props}` to the
   underlying Chakra primitive. */
import * as React from 'react';
import { Box, type BoxProps } from '@chakra-ui/react';

export type ProseProps = Omit<BoxProps, 'className'>;

export const Prose = React.forwardRef<HTMLDivElement, ProseProps>(function Prose(props, ref) {
  return <Box ref={ref} className="entry-content" {...props} />;
});
