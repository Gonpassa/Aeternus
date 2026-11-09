// The look of a Topic wherever one appears: on a catalog card, on the Source header, inherited
// on a filed note, in the composer's tagger, and as a filter in the catalog's strip. One
// declaration rather than five, because a Topic has to be recognisable as the same thing in all
// of them - a cross-cutting label, read in the mono label voice the module's other labels use.
export const TOPIC_CHIP = {
  textStyle: 'label',
  color: 'inkBlue',
  bg: 'paper',
  borderWidth: '1px',
  borderColor: 'line',
  borderRadius: 'md',
  px: '2',
  py: '0.5',
  // Never wrapped mid-word: a Topic name is one token, and a name broken across two lines reads
  // as two Topics.
  whiteSpace: 'nowrap',
} as const;
