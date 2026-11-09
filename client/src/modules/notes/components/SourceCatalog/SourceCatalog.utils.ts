import type { SourceListEntry, Topic } from '@nee3/shared-types';

// The Topics the strip can offer: every Topic some Source on the shelf carries, in alphabetical
// order so the strip reads as a stable row rather than reshuffling as the catalog reorders. The
// vocabulary as a whole is wider than this - a Topic nobody carries any more stays in it - and a
// filter that can only empty the shelf is not worth offering (CONTEXT.md, Topic).
export const catalogTopics = (sources: SourceListEntry[]): Topic[] => {
  const byId = new Map<number, Topic>();
  sources.forEach((source) => {
    source.topics.forEach((topic) => byId.set(topic.id, topic));
  });
  return [...byId.values()].sort((a, b) => a.name.localeCompare(b.name));
};

// Filtering narrows what the shelf shows and never reorders it: the catalog's order is the
// server's, by most recent Literature note (#70).
export const filterSourcesByTopic = (
  sources: SourceListEntry[],
  topicId: number | null,
): SourceListEntry[] =>
  topicId === null
    ? sources
    : sources.filter((source) => source.topics.some((topic) => topic.id === topicId));
