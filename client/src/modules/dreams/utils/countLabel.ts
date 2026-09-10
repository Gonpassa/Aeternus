// "1 anchor" / "3 anchors". Both places that tally a dream's attachments do it in prose -
// DreamEdit's delete warning and DreamAnalysis's remove-note confirmation - and each counts
// several kinds in one sentence, so every kind needs its own plural.
export const countLabel = (count: number, singular: string, plural: string): string =>
  `${count} ${count === 1 ? singular : plural}`;
