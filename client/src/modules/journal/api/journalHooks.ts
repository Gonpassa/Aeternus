import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AxiosError } from 'axios';
import type {
  CreateEntryRequest,
  Entry,
  EntryListResponse,
  UpdateEntryRequest,
} from '@nee3/shared-types';
import { apiClient } from '../../../api/client.ts';
import { endpoints } from '../../../api/endpoints.ts';

export const journalKeys = {
  all: ['journal', 'entries'] as const,
  list: (page: number) => ['journal', 'entries', 'list', page] as const,
  detail: (id: number) => ['journal', 'entries', 'detail', id] as const,
  byDate: (date: string) => ['journal', 'entries', 'by-date', date] as const,
};

export const useEntries = (page: number) =>
  useQuery<EntryListResponse>({
    queryKey: journalKeys.list(page),
    queryFn: async () => {
      const { data } = await apiClient.get<EntryListResponse>(endpoints.journal.entries, {
        params: { page, pageSize: 20 },
      });
      return data;
    },
  });

export const useEntry = (id: number) =>
  useQuery<Entry>({
    queryKey: journalKeys.detail(id),
    queryFn: async () => {
      const { data } = await apiClient.get<{ entry: Entry }>(endpoints.journal.entry(id));
      return data.entry;
    },
  });

export const useEntryByDate = (date: string | null) =>
  useQuery<Entry | null>({
    queryKey: journalKeys.byDate(date ?? ''),
    enabled: Boolean(date),
    queryFn: async () => {
      try {
        const { data } = await apiClient.get<{ entry: Entry }>(
          endpoints.journal.entryByDate(date as string),
        );
        return data.entry;
      } catch (err) {
        if (err instanceof AxiosError && err.response?.status === 404) {
          return null;
        }
        throw err;
      }
    },
  });

export const useCreateEntry = () => {
  const queryClient = useQueryClient();
  return useMutation<Entry, Error, CreateEntryRequest>({
    mutationFn: async (input) => {
      const { data } = await apiClient.post<{ entry: Entry }>(endpoints.journal.entries, input);
      return data.entry;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: journalKeys.all }),
  });
};

export const useUpdateEntry = () => {
  const queryClient = useQueryClient();
  return useMutation<Entry, Error, { id: number; input: UpdateEntryRequest }>({
    mutationFn: async ({ id, input }) => {
      const { data } = await apiClient.put<{ entry: Entry }>(endpoints.journal.entry(id), input);
      return data.entry;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: journalKeys.all }),
  });
};

export const useDeleteEntry = () => {
  const queryClient = useQueryClient();
  return useMutation<void, Error, number>({
    mutationFn: async (id) => {
      await apiClient.delete(endpoints.journal.entry(id));
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: journalKeys.all }),
  });
};
