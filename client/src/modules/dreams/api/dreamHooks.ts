import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type {
  Anchor,
  CreateDreamRequest,
  CreateEmotionalBeatRequest,
  Dream,
  DreamDetailResponse,
  DreamListResponse,
  EmotionalBeat,
  UpdateDreamRequest,
  UpdateEmotionalBeatRequest,
} from '@nee3/shared-types';
import { apiClient } from '../../../api/client.ts';
import { endpoints } from '../../../api/endpoints.ts';

export const dreamKeys = {
  all: ['dreams'] as const,
  list: () => ['dreams', 'list'] as const,
  detail: (id: number) => ['dreams', 'detail', id] as const,
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

export const useDream = (dreamId: number) =>
  useQuery<DreamDetailResponse>({
    queryKey: dreamKeys.detail(dreamId),
    queryFn: async () => {
      const { data } = await apiClient.get<DreamDetailResponse>(endpoints.dream(dreamId));
      return data;
    },
  });

export const useUpdateDream = (dreamId: number) => {
  const queryClient = useQueryClient();
  return useMutation<Dream, Error, UpdateDreamRequest>({
    mutationFn: async (input) => {
      const { data } = await apiClient.patch<{ dream: Dream }>(endpoints.dream(dreamId), input);
      return data.dream;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: dreamKeys.all }),
  });
};

export const useCreateAnchor = (dreamId: number) => {
  const queryClient = useQueryClient();
  return useMutation<Anchor, Error, void>({
    mutationFn: async () => {
      const { data } = await apiClient.post<{ anchor: Anchor }>(endpoints.dreamAnchors(dreamId));
      return data.anchor;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: dreamKeys.detail(dreamId) }),
  });
};

export const useDeleteAnchor = (dreamId: number) => {
  const queryClient = useQueryClient();
  return useMutation<void, Error, number>({
    mutationFn: async (anchorId) => {
      await apiClient.delete(endpoints.anchor(anchorId));
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: dreamKeys.detail(dreamId) }),
  });
};

export const useCreateEmotionalBeat = (dreamId: number) => {
  const queryClient = useQueryClient();
  return useMutation<EmotionalBeat, Error, { anchorId: number; input: CreateEmotionalBeatRequest }>(
    {
      mutationFn: async ({ anchorId, input }) => {
        const { data } = await apiClient.post<{ emotionalBeat: EmotionalBeat }>(
          endpoints.anchorEmotionalBeats(anchorId),
          input,
        );
        return data.emotionalBeat;
      },
      onSuccess: () => queryClient.invalidateQueries({ queryKey: dreamKeys.detail(dreamId) }),
    },
  );
};

export const useUpdateEmotionalBeat = (dreamId: number) => {
  const queryClient = useQueryClient();
  return useMutation<EmotionalBeat, Error, { id: number; input: UpdateEmotionalBeatRequest }>({
    mutationFn: async ({ id, input }) => {
      const { data } = await apiClient.patch<{ emotionalBeat: EmotionalBeat }>(
        endpoints.emotionalBeat(id),
        input,
      );
      return data.emotionalBeat;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: dreamKeys.detail(dreamId) }),
  });
};

export const useDeleteEmotionalBeat = (dreamId: number) => {
  const queryClient = useQueryClient();
  return useMutation<void, Error, number>({
    mutationFn: async (id) => {
      await apiClient.delete(endpoints.emotionalBeat(id));
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: dreamKeys.detail(dreamId) }),
  });
};
