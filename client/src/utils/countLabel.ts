// "1 anchor" / "3 anchors". Callers tally in prose - a dream's attachments in DreamEdit's
// delete warning and DreamAnalysis's remove-note confirmation, a Source's Literature notes on
// its catalog card - and a sentence may count several kinds at once, so every kind passes its
// own plural rather than having one appended here.
export const countLabel = (count: number, singular: string, plural: string): string =>
  `${count} ${count === 1 ? singular : plural}`;
