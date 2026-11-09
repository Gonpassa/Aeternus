import { useQuery } from '@tanstack/react-query';
import type { Topic, TopicListResponse, TopicRelatedNotesResponse } from '@nee3/shared-types';
import { apiClient } from '../../../api/client.ts';
import { endpoints } from '../../../api/endpoints.ts';

export const topicKeys = {
  all: ['topics'] as const,
  list: () => ['topics', 'list'] as const,
  relatedNotes: (noteId: number) => ['topics', 'related-notes', noteId] as const,
};

// The whole vocabulary, not a per-keystroke search: the list is one user's own words, the
// autocomplete atom filters it in the browser, and a Topic is created by typing a name that is
// not in it. The server's q filter exists for a caller that needs it; this one does not.
export const useTopics = () =>
  useQuery<Topic[]>({
    queryKey: topicKeys.list(),
    queryFn: async () => {
      const { data } = await apiClient.get<TopicListResponse>(endpoints.topics);
      return data.topics;
    },
  });

// The notes sharing a Topic with one note - the link panel's middle tier (#85). Read on demand,
// because the tier is only wanted once the user is looking for something to link to.
export const useTopicRelatedNotes = (noteId: number, enabled: boolean) =>
  useQuery<TopicRelatedNotesResponse>({
    queryKey: topicKeys.relatedNotes(noteId),
    queryFn: async () => {
      const { data } = await apiClient.get<TopicRelatedNotesResponse>(
        endpoints.topicRelatedNotes(noteId),
      );
      return data;
    },
    enabled,
  });
