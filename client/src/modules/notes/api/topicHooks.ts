import { useMutation, useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query';
import { isAxiosError } from 'axios';
import type {
  RenameTopicRequest,
  RenameTopicResponse,
  TopicDetailResponse,
  TopicListEntry,
  TopicListResponse,
  TopicMergeConflictResponse,
  TopicRelatedNotesResponse,
} from '@nee3/shared-types';
import { apiClient } from '../../../api/client.ts';
import { endpoints } from '../../../api/endpoints.ts';
import { noteKeys, sourceKeys, topicKeys } from './queryKeys.ts';

// The whole vocabulary, not a per-keystroke search: the list is one user's own words, the
// autocomplete atom filters it in the browser, and a Topic is created by typing a name that is
// not in it. The server's q filter exists for a caller that needs it; this one does not.
export const useTopics = () =>
  useQuery<TopicListEntry[]>({
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

// The Topic view's payload: the Topic, the Permanent notes carrying it most-linked first, and
// then the Sources carrying it (#88). A Topic is a place of its own rather than a filter state,
// so it is read by its id rather than assembled from the catalog.
export const useTopic = (topicId: number) =>
  useQuery<TopicDetailResponse>({
    queryKey: topicKeys.detail(topicId),
    queryFn: async () => {
      const { data } = await apiClient.get<TopicDetailResponse>(endpoints.topic(topicId));
      return data;
    },
  });

export interface RenameTopicVariables {
  topicId: number;
  input: RenameTopicRequest;
}

// A Topic shows up on every carrier at once, so when one is renamed, merged or deleted every
// cached payload that names a Topic is dropped rather than patched - the catalog's cards, the
// reading pages' headers and the notes' own Topic lists all carry it. The Topic's own payload
// is removed rather than refetched, because a merge or a delete leaves its id pointing at
// nothing.
const forgetTopicEverywhere = (queryClient: QueryClient, topicId: number) => {
  queryClient.removeQueries({ queryKey: topicKeys.detail(topicId) });
  queryClient.invalidateQueries({ queryKey: topicKeys.all });
  queryClient.invalidateQueries({ queryKey: sourceKeys.all });
  queryClient.invalidateQueries({ queryKey: noteKeys.all });
};

// Renaming, which is also the merge: the server answers with the Topic that survived and says
// which of the two happened (CONTEXT.md, Topic). A merge the request did not agree to is
// refused with a 409 carrying the Topic the name already belongs to, so the caller can confirm
// and ask again with `merge` - the confirmation is enforced by the server rather than being a
// courtesy the client could skip (#88).
export const useRenameTopic = () => {
  const queryClient = useQueryClient();
  return useMutation<RenameTopicResponse, Error, RenameTopicVariables>({
    mutationFn: async ({ topicId, input }) => {
      const { data } = await apiClient.patch<RenameTopicResponse>(endpoints.topic(topicId), input);
      return data;
    },
    onSuccess: (_result, { topicId }) => forgetTopicEverywhere(queryClient, topicId),
  });
};

// The Topic a rename collided with, or null when the failure was something else. A 409 is the
// server asking for the merge to be confirmed rather than an error to surface.
export const mergeConflictFrom = (error: unknown): TopicListEntry | null => {
  if (!isAxiosError<TopicMergeConflictResponse>(error) || error.response?.status !== 409) {
    return null;
  }
  return error.response.data.mergeTarget ?? null;
};

// Deleting a Topic takes the word off every carrier and touches no note, so the same caches a
// rename drops are dropped here.
export const useDeleteTopic = () => {
  const queryClient = useQueryClient();
  return useMutation<void, Error, number>({
    mutationFn: async (topicId) => {
      await apiClient.delete(endpoints.topic(topicId));
    },
    onSuccess: (_result, topicId) => forgetTopicEverywhere(queryClient, topicId),
  });
};
