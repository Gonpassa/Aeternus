import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AxiosError } from 'axios';
import type {
  CreateEntryRequest,
  Entry,
  EntryDetailResponse,
  EntryListResponse,
  EntryRangeQuery,
  JournalSummaryResponse,
  UpdateEntryRequest,
} from '@nee3/shared-types';
import { apiClient } from '../../../api/client.ts';
import { endpoints } from '../../../api/endpoints.ts';

export const journalKeys = {
  all: ['journal', 'entries'] as const,
  list: () => ['journal', 'entries', 'list'] as const,
  detail: (id: number) => ['journal', 'entries', 'detail', id] as const,
  byDate: (date: string) => ['journal', 'entries', 'by-date', date] as const,
  byRange: (start: string, end: string) => ['journal', 'entries', 'by-range', start, end] as const,
  summary: (asOf: string) => ['journal', 'entries', 'summary', asOf] as const,
};

export const useEntries = () =>
  useQuery<Entry[]>({
    queryKey: journalKeys.list(),
    queryFn: async () => {
      const { data } = await apiClient.get<EntryListResponse>(endpoints.journal.entries);
      return data.entries;
    },
  });

export type EntryWithNeighbors = Entry & {
  nextEntryId: number | null;
  previousEntryId: number | null;
};

export const useEntry = (id: number, options?: { enabled?: boolean }) =>
  useQuery<EntryWithNeighbors>({
    queryKey: journalKeys.detail(id),
    enabled: options?.enabled,
    queryFn: async () => {
      const { data } = await apiClient.get<EntryDetailResponse>(endpoints.journal.entry(id));
      return {
        ...data.entry,
        nextEntryId: data.nextEntryId,
        previousEntryId: data.previousEntryId,
      };
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

export const useEntriesByRange = ({ start, end }: EntryRangeQuery) =>
  useQuery<Entry[]>({
    queryKey: journalKeys.byRange(start, end),
    enabled: Boolean(start) && Boolean(end),
    queryFn: async () => {
      const { data } = await apiClient.get<Entry[]>(endpoints.journal.entriesByRange, {
        params: { start, end },
      });
      return data;
    },
  });

export const useJournalSummary = (asOf: string) =>
  useQuery<JournalSummaryResponse>({
    queryKey: journalKeys.summary(asOf),
    queryFn: async () => {
      const { data } = await apiClient.get<JournalSummaryResponse>(endpoints.journal.summary, {
        params: { asOf },
      });
      return data;
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
