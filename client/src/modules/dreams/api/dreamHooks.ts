import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { CreateDreamRequest, Dream, DreamListResponse } from '@nee3/shared-types';
import { apiClient } from '../../../api/client.ts';
import { endpoints } from '../../../api/endpoints.ts';

export const dreamKeys = {
  all: ['dreams'] as const,
  list: () => ['dreams', 'list'] as const,
};

export const useDreams = () =>
  useQuery<Dream[]>({
    queryKey: dreamKeys.list(),
    queryFn: async () => {
      const { data } = await apiClient.get<DreamListResponse>(endpoints.dreams);
      return data.dreams;
    },
  });

export const useCreateDream = () => {
  const queryClient = useQueryClient();
  return useMutation<Dream, Error, CreateDreamRequest>({
    mutationFn: async (input) => {
      const { data } = await apiClient.post<{ dream: Dream }>(endpoints.dreams, input);
      return data.dream;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: dreamKeys.all }),
  });
};
