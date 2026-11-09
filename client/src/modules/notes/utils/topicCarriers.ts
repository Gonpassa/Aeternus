import type { TopicListEntry } from '@nee3/shared-types';
import { countLabel } from '../../../utils/countLabel.ts';

// How many carriers wear a Topic, said in one line: the two kinds are counted separately
// because they are two different things to go and read, and a Topic nobody carries any more
// says so rather than showing two zeroes (CONTEXT.md, Topic).
export const topicCarrierLabel = ({
  permanentNoteCount,
  sourceCount,
}: Pick<TopicListEntry, 'permanentNoteCount' | 'sourceCount'>): string => {
  if (permanentNoteCount === 0 && sourceCount === 0) return 'Nothing carries it';
  return [
    countLabel(permanentNoteCount, 'Permanent note', 'Permanent notes'),
    countLabel(sourceCount, 'Source', 'Sources'),
  ].join(' · ');
};
