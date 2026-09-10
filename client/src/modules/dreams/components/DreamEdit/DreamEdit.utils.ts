// Anchors previously known to exist (per the server) whose id no longer appears anywhere
// in the current document - i.e. their marked text was deleted from the narrative. Drives
// the on-save cascade-delete-with-warning behavior (see ADR-0007, CONTEXT.md's Anchor
// deletion-on-text-removal rule).
export const computeMissingAnchorIds = (knownIds: number[], presentIds: number[]): number[] => {
  const presentSet = new Set(presentIds);
  return knownIds.filter((id) => !presentSet.has(id));
};
