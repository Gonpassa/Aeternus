import { useMemo } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type {
  CreateLinkRequest,
  LinkResponse,
  LinkTargetsResponse,
  UpdateLinkReasonRequest,
} from '@nee3/shared-types';
import { apiClient } from '../../../api/client.ts';
import { endpoints } from '../../../api/endpoints.ts';
import type { LinkActions } from '../LinkActionsContext.tsx';
import { noteKeys, sourceKeys } from './queryKeys.ts';

export const linkKeys = {
  all: ['links'] as const,
  targets: (fromNoteId: number, query: string) => ['links', 'targets', fromNoteId, query] as const,
};

// The panel's own read. Keyed on the note being linked from and on the query, so the untyped
// state - the browsable tier on its own - is a cached result in its own right rather than
// something refetched every time the search box is emptied.
export const useLinkTargets = (fromNoteId: number, query: string, enabled: boolean) =>
  useQuery<LinkTargetsResponse>({
    queryKey: linkKeys.targets(fromNoteId, query),
    queryFn: async () => {
      const { data } = await apiClient.get<LinkTargetsResponse>(endpoints.noteLinkTargets, {
        params: { fromNoteId, q: query === '' ? undefined : query },
      });
      return data;
    },
    enabled,
  });

// Everything a Link changes is somebody's connections view, and the server is what assembles
// those groupings, so every one of these invalidates rather than patching: the reading page's
// payload, any note's connections read on demand, and the panel's own tiers, whose
// `existingLink` marks are exactly what a new Link changes.
const useLinkInvalidation = () => {
  const queryClient = useQueryClient();
  return () => {
    queryClient.invalidateQueries({ queryKey: sourceKeys.all });
    queryClient.invalidateQueries({ queryKey: noteKeys.all });
    queryClient.invalidateQueries({ queryKey: linkKeys.all });
  };
};

// A Link between two notes that both already exist. The server answers with the Link whether
// it made one or added this end's reason to the one that was there, since there is at most one
// per unordered pair (ADR 0013) - so the client has nothing to decide between the two cases.
export const useCreateLink = () => {
  const invalidate = useLinkInvalidation();
  return useMutation<LinkResponse, Error, CreateLinkRequest>({
    mutationFn: async (input) => {
      const { data } = await apiClient.post<LinkResponse>(endpoints.links, input);
      return data;
    },
    onSuccess: invalidate,
  });
};

export interface UpdateLinkReasonVariables extends UpdateLinkReasonRequest {
  linkId: number;
}

export const useUpdateLinkReason = () => {
  const invalidate = useLinkInvalidation();
  return useMutation<LinkResponse, Error, UpdateLinkReasonVariables>({
    mutationFn: async ({ linkId, fromNoteId, reason }) => {
      const { data } = await apiClient.patch<LinkResponse>(endpoints.link(linkId), {
        fromNoteId,
        reason,
      });
      return data;
    },
    onSuccess: invalidate,
  });
};

// Removal can be refused outright - a Link that is a Permanent note's last is not the user's
// to remove (ADR 0014) - and the refusal names the idea it is protecting. The rejection is
// passed through unreshaped: utils/linkRefusal.ts reads the server's words off it, and the
// confirmation dialog shows them where the removal was asked for.
export const useDeleteLink = () => {
  const invalidate = useLinkInvalidation();
  return useMutation<void, Error, number>({
    mutationFn: async (linkId) => {
      await apiClient.delete(endpoints.link(linkId));
    },
    onSuccess: invalidate,
  });
};

// The three Link writes assembled into the one surface every linking affordance on the page
// uses, so the reading page and, later, Review each wire this once instead of threading three
// mutations apiece. The hooks above stay separately usable; this is only the assembly.
export const useLinkActions = (): LinkActions => {
  const { mutateAsync: createLink } = useCreateLink();
  const { mutateAsync: updateReason } = useUpdateLinkReason();
  const { mutateAsync: removeLink } = useDeleteLink();
  // Memoised because this goes straight into a context provider: a fresh object every render would
  // re-render every card on the page for nothing. `mutateAsync` is stable across renders, so
  // the identities it closes over are too.
  return useMemo(
    () => ({
      link: async (input) => {
        await createLink(input);
      },
      editReason: async (linkId, fromNoteId, reason) => {
        await updateReason({ linkId, fromNoteId, reason });
      },
      removeLink: async (linkId) => {
        await removeLink(linkId);
      },
    }),
    [createLink, updateReason, removeLink],
  );
};
