import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type {
  CreatePermanentNoteRequest,
  NoteConnectionsResponse,
  PermanentNoteResponse,
} from '@nee3/shared-types';
import { apiClient } from '../../../api/client.ts';
import { endpoints } from '../../../api/endpoints.ts';
import { noteKeys, sourceKeys, topicKeys } from './queryKeys.ts';

// A note's connections, for either kind. The reading page already has its own cards'
// connections folded into one payload, so this is for the note at the other end of a row -
// read on demand, since a row is only opened when the user wants what is behind it.
export const useNoteConnections = (noteId: number, enabled: boolean) =>
  useQuery<NoteConnectionsResponse>({
    queryKey: noteKeys.connections(noteId),
    queryFn: async () => {
      const { data } = await apiClient.get<NoteConnectionsResponse>(
        endpoints.noteConnections(noteId),
      );
      return data;
    },
    enabled,
  });

// One mutation for the note and its first Links, because they are one request in one
// transaction (ADR 0014). `sourceId` is not part of the note - a Permanent note belongs to no
// Source - it is the reading page whose cards gain an inbound connection, which is the payoff
// the user is waiting to see. Review writes from a note it reached without a reading page, so
// it passes none and every Source's cached payload is refetched instead.
export const useCreatePermanentNote = (sourceId?: number) => {
  const queryClient = useQueryClient();
  return useMutation<PermanentNoteResponse, Error, CreatePermanentNoteRequest>({
    mutationFn: async (input) => {
      const { data } = await apiClient.post<PermanentNoteResponse>(endpoints.permanentNotes, input);
      return data;
    },
    // Refetched rather than patched in place: the new Link lands in the connections of
    // whichever cards it names, and the server already assembles that grouping.
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: sourceId === undefined ? sourceKeys.all : sourceKeys.detail(sourceId),
      });
      queryClient.invalidateQueries({ queryKey: noteKeys.all });
      // Writing the note is the other way a Topic is created, and the Topic tiers of other
      // notes change the moment this one carries a word they share (#87).
      queryClient.invalidateQueries({ queryKey: topicKeys.all });
    },
  });
};
