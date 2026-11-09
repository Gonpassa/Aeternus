import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type {
  LiteratureNote,
  RecordReviewAnswerRequest,
  ReviewAnswerResponse,
  ReviewDueCountResponse,
  ReviewQueueResponse,
  UpdateLiteratureNoteRequest,
} from '@nee3/shared-types';
import { apiClient } from '../../../api/client.ts';
import { endpoints } from '../../../api/endpoints.ts';
import { noteKeys, reviewKeys, sourceKeys } from './queryKeys.ts';

// The queue as a pass reads it. Deliberately not refetched while a pass is under way: an
// Answer changes which band its note belongs to, and a queue that re-sorted itself under the
// user mid-sitting would move the next card while they were reading it. A new pass is a new
// read, which the Review page asks for explicitly.
export const useReviewQueue = () =>
  useQuery<ReviewQueueResponse>({
    queryKey: reviewKeys.queue,
    queryFn: async () => {
      const { data } = await apiClient.get<ReviewQueueResponse>(endpoints.review.queue);
      return data;
    },
    refetchOnWindowFocus: false,
  });

// The rail badge's read: "Review · N due", counting notes that have never been answered. The
// only number the module shows, which is why it has a request of its own rather than making
// every page pull the queue.
export const useReviewDueCount = () =>
  useQuery<ReviewDueCountResponse>({
    queryKey: reviewKeys.dueCount,
    queryFn: async () => {
      const { data } = await apiClient.get<ReviewDueCountResponse>(endpoints.review.dueCount);
      return data;
    },
  });

// Recorded on completion rather than on intent (ADR 0011): the caller sends this once the Link
// or the Permanent note exists, so an abandoned composer records nothing and leaves the note
// due. Only the badge is invalidated - the queue stays as the pass read it, for the reason
// above.
export const useRecordReviewAnswer = () => {
  const queryClient = useQueryClient();
  return useMutation<ReviewAnswerResponse, Error, RecordReviewAnswerRequest>({
    mutationFn: async (input) => {
      const { data } = await apiClient.post<ReviewAnswerResponse>(endpoints.review.answers, input);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: reviewKeys.dueCount });
    },
  });
};

// Clearing the open-question flag, which is orthogonal to the Answers: no Answer resolves it
// and the user clears it explicitly (CONTEXT.md, Open question). It goes through the note's own
// correction endpoint, whose payload is the whole note, so the note travels with the change
// rather than a patch of one field.
export const useClearOpenQuestion = () => {
  const queryClient = useQueryClient();
  return useMutation<void, Error, LiteratureNote>({
    mutationFn: async (note) => {
      await apiClient.patch(endpoints.note(note.id), {
        body: note.body,
        section: note.section,
        position: note.position,
        excerpt: note.excerpt,
        openQuestion: false,
      } satisfies UpdateLiteratureNoteRequest);
    },
    // The flag is on the note itself, so it is the reading page and any connections view of
    // that note that go stale, not the badge - clearing a flag is not an Answer.
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: sourceKeys.all });
      queryClient.invalidateQueries({ queryKey: noteKeys.all });
    },
  });
};
