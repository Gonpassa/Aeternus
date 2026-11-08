import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type {
  CreateLiteratureNoteRequest,
  CreateSourceRequest,
  LiteratureNote,
  LiteratureNoteResponse,
  Source,
  SourceDetailResponse,
  SourceListEntry,
  SourceListResponse,
} from '@nee3/shared-types';
import { apiClient } from '../../../api/client.ts';
import { endpoints } from '../../../api/endpoints.ts';

export const sourceKeys = {
  all: ['sources'] as const,
  list: () => ['sources', 'list'] as const,
  detail: (id: number) => ['sources', 'detail', id] as const,
};

export const useSources = () =>
  useQuery<SourceListEntry[]>({
    queryKey: sourceKeys.list(),
    queryFn: async () => {
      const { data } = await apiClient.get<SourceListResponse>(endpoints.sources);
      return data.sources;
    },
  });

export const useSource = (sourceId: number) =>
  useQuery<SourceDetailResponse>({
    queryKey: sourceKeys.detail(sourceId),
    queryFn: async () => {
      const { data } = await apiClient.get<SourceDetailResponse>(endpoints.source(sourceId));
      return data;
    },
  });

export const useCreateSource = () => {
  const queryClient = useQueryClient();
  return useMutation<Source, Error, CreateSourceRequest>({
    mutationFn: async (input) => {
      const { data } = await apiClient.post<{ source: Source }>(endpoints.sources, input);
      return data.source;
    },
    // The catalog's order is derived from each Source's notes, so a new Source changes the
    // whole list rather than appending to it - invalidate the lot.
    onSuccess: () => queryClient.invalidateQueries({ queryKey: sourceKeys.all }),
  });
};

export const useCreateLiteratureNote = (sourceId: number) => {
  const queryClient = useQueryClient();
  return useMutation<LiteratureNote, Error, CreateLiteratureNoteRequest>({
    mutationFn: async (input) => {
      const { data } = await apiClient.post<LiteratureNoteResponse>(
        endpoints.sourceNotes(sourceId),
        input,
      );
      return data.note;
    },
    // The filed card is appended to the reading page's cached payload rather than refetched,
    // so the stream grows without a page reload and the capture card keeps the focus it was
    // just handed. The note's own section joins the tab's suggestions in the same stroke,
    // first, since it is the one the reader is in.
    onSuccess: (note) => {
      queryClient.setQueryData<SourceDetailResponse>(sourceKeys.detail(sourceId), (previous) =>
        previous
          ? {
              ...previous,
              notes: [...previous.notes, note],
              sections:
                note.section === null
                  ? previous.sections
                  : [note.section, ...previous.sections.filter((name) => name !== note.section)],
            }
          : previous,
      );
      // The catalog's order and each card's note count are derived from the notes, so a filed
      // note changes the whole list rather than one entry of it.
      queryClient.invalidateQueries({ queryKey: sourceKeys.list() });
    },
  });
};
