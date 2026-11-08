import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type {
  CreateSourceRequest,
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
