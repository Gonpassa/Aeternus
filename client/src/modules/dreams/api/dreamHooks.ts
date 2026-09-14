import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type {
  AnalysisPass,
  Anchor,
  Association,
  CreateAnalysisPassRequest,
  CreateAssociationRequest,
  CreateDreamRequest,
  CreateEmotionalBeatRequest,
  CreateSymbolAttachmentRequest,
  Dream,
  DreamDetailResponse,
  DreamListResponse,
  DreamSummaryResponse,
  DreamSymbol,
  EmotionalBeat,
  SymbolAttachmentDetail,
  SymbolListResponse,
  UpdateAssociationRequest,
  UpdateDreamRequest,
  UpdateEmotionalBeatRequest,
} from '@nee3/shared-types';
import { apiClient } from '../../../api/client.ts';
import { endpoints } from '../../../api/endpoints.ts';

export const dreamKeys = {
  all: ['dreams'] as const,
  list: () => ['dreams', 'list'] as const,
  detail: (id: number) => ['dreams', 'detail', id] as const,
  summary: (asOf: string) => ['dreams', 'summary', asOf] as const,
  symbols: () => ['dreams', 'symbols'] as const,
};

export const useDreams = () =>
  useQuery<Dream[]>({
    queryKey: dreamKeys.list(),
    queryFn: async () => {
      const { data } = await apiClient.get<DreamListResponse>(endpoints.dreams);
      return data.dreams;
    },
  });

export const useDreamSummary = (asOf: string) =>
  useQuery<DreamSummaryResponse>({
    queryKey: dreamKeys.summary(asOf),
    queryFn: async () => {
      const { data } = await apiClient.get<DreamSummaryResponse>(endpoints.dreamsSummary, {
        params: { asOf },
      });
      return data;
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

// The user's whole Symbol vocabulary; suggestion filtering happens client-side in
// SymbolAutocompleteInput (the endpoint also accepts a q filter, unused here).
export const useSymbols = () =>
  useQuery<DreamSymbol[]>({
    queryKey: dreamKeys.symbols(),
    queryFn: async () => {
      const { data } = await apiClient.get<SymbolListResponse>(endpoints.symbols);
      return data.symbols;
    },
  });

export const useTagSymbol = (dreamId: number) => {
  const queryClient = useQueryClient();
  return useMutation<
    SymbolAttachmentDetail,
    Error,
    { anchorId: number; input: CreateSymbolAttachmentRequest }
  >({
    mutationFn: async ({ anchorId, input }) => {
      const { data } = await apiClient.post<{ symbolAttachment: SymbolAttachmentDetail }>(
        endpoints.anchorSymbols(anchorId),
        input,
      );
      return data.symbolAttachment;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: dreamKeys.detail(dreamId) });
      // Tagging may have grown the vocabulary the autocomplete draws from.
      queryClient.invalidateQueries({ queryKey: dreamKeys.symbols() });
    },
  });
};

export const useUntagSymbol = (dreamId: number) => {
  const queryClient = useQueryClient();
  return useMutation<void, Error, number>({
    mutationFn: async (symbolAttachmentId) => {
      await apiClient.delete(endpoints.symbolAttachment(symbolAttachmentId));
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: dreamKeys.detail(dreamId) }),
  });
};

export const useCreateAssociation = (dreamId: number) => {
  const queryClient = useQueryClient();
  return useMutation<Association, Error, { anchorId: number; input: CreateAssociationRequest }>({
    mutationFn: async ({ anchorId, input }) => {
      const { data } = await apiClient.post<{ association: Association }>(
        endpoints.anchorAssociations(anchorId),
        input,
      );
      return data.association;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: dreamKeys.detail(dreamId) }),
  });
};

export const useUpdateAssociation = (dreamId: number) => {
  const queryClient = useQueryClient();
  return useMutation<Association, Error, { id: number; input: UpdateAssociationRequest }>({
    mutationFn: async ({ id, input }) => {
      const { data } = await apiClient.patch<{ association: Association }>(
        endpoints.association(id),
        input,
      );
      return data.association;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: dreamKeys.detail(dreamId) }),
  });
};

export const useDeleteAssociation = (dreamId: number) => {
  const queryClient = useQueryClient();
  return useMutation<void, Error, number>({
    mutationFn: async (id) => {
      await apiClient.delete(endpoints.association(id));
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: dreamKeys.detail(dreamId) }),
  });
};

// Create-only, mirroring the API: analysis passes are append-only by design.
export const useCreateAnalysisPass = (dreamId: number) => {
  const queryClient = useQueryClient();
  return useMutation<AnalysisPass, Error, CreateAnalysisPassRequest>({
    mutationFn: async (input) => {
      const { data } = await apiClient.post<{ analysisPass: AnalysisPass }>(
        endpoints.dreamAnalysisPasses(dreamId),
        input,
      );
      return data.analysisPass;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: dreamKeys.detail(dreamId) }),
  });
};
