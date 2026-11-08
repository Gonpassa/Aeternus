// Fields written straight onto an index card: the blank card capture is written on, the same
// card reopened for a correction, and the Permanent note composer. Shared rather than copied: `Input` and `Textarea` apply their recipe through `css`,
// which outranks style props, so every field written on a card needs this same removal.
export const WRITTEN_ON_CARD = {
  height: 'auto',
  padding: '0',
  background: 'transparent',
  border: 'none',
  borderRadius: '0',
} as const;

// The same field when it is a line the user writes into rather than a label already on the
// card: focus shows as the rule under the line, the way a ruled card already reads.
export const WRITTEN_ON_CARD_RULED = {
  ...WRITTEN_ON_CARD,
  '&:focus-visible': {
    outline: 'none',
    boxShadow: 'inset 0 -1px 0 {colors.moss}',
  },
} as const;
