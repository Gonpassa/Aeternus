/* eslint-disable prefer-arrow-callback, @typescript-eslint/no-shadow, react/jsx-props-no-spreading --
   Mirrors the Button.tsx wrapper pattern: `function RuledNote` names the ref-forwarding
   component for DevTools, and remaining props are forwarded via `{...props}` to the
   underlying Chakra primitive. */
import * as React from 'react';
import { Box, type BoxProps } from '@chakra-ui/react';

// The rule's color carries meaning: hairline for a resting margin note, rust for the
// active Anchor, ink-blue for Analytic entries, moss for Synthetic ones.
export type RuledNoteRule = 'hairline' | 'rust' | 'inkBlue' | 'moss';

export interface RuledNoteProps extends BoxProps {
  rule?: RuledNoteRule;
}

const ruleColor: Record<RuledNoteRule, string> = {
  hairline: 'line',
  rust: 'rust',
  inkBlue: 'inkBlue',
  moss: 'moss',
};

// A content block with a colored left rule - the annotated-block look shared by margin
// notes and analysis-pass entries, defined once.
export const RuledNote = React.forwardRef<HTMLDivElement, RuledNoteProps>(function RuledNote(
  { rule = 'hairline', ...props },
  ref,
) {
  return (
    <Box
      ref={ref}
      borderLeftWidth="2px"
      borderLeftStyle="solid"
      borderLeftColor={ruleColor[rule]}
      pl="3"
      py="1"
      transition="border-color 150ms ease"
      {...props}
    />
  );
});
