import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type {
  CreateLiteratureNoteRequest,
  CreateSourceRequest,
  LiteratureNote,
  LiteratureNoteResponse,
  SourceDetailResponse,
  SourceListEntry,
  SourceListResponse,
  SourceResponse,
  SourceWithTopics,
  UpdateLiteratureNoteRequest,
  UpdateSourceRequest,
} from '@nee3/shared-types';
import { apiClient } from '../../../api/client.ts';
import { endpoints } from '../../../api/endpoints.ts';
import { sourceKeys, topicKeys } from './queryKeys.ts';

// The sections the capture card offers, recomputed from the notes that are left: most
// recently filed first, so the section being read in is offered first, exactly as the reading
// page's own payload orders them. A correction or a deletion can retire a section outright,
// which is why this is derived from the stream rather than edited alongside it.
const sectionSuggestions = (notes: LiteratureNote[]): string[] => {
  const seen: string[] = [];
  [...notes].reverse().forEach((note) => {
    // Blank-after-trimming counts as no section, matching the server's own btrim filter.
    const section = note.section?.trim() ?? '';
    if (section !== '' && !seen.includes(section)) {
      seen.push(section);
    }
  });
  return seen;
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
  return useMutation<SourceWithTopics, Error, CreateSourceRequest>({
    mutationFn: async (input) => {
      const { data } = await apiClient.post<SourceResponse>(endpoints.sources, input);
      return data.source;
    },
    // The catalog's order is derived from each Source's notes, so a new Source changes the
    // whole list rather than appending to it - invalidate the lot. The vocabulary goes with it:
    // filing a Source is one of the two ways a Topic is created (#87).
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: sourceKeys.all });
      queryClient.invalidateQueries({ queryKey: topicKeys.all });
    },
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
              // A note just filed has no Links yet, so it joins the stream with two empty
              // groups rather than waiting for a refetch to tell it so.
              notes: [
                ...previous.notes,
                { ...note, connections: { connectsTo: [], connectedFrom: [] } },
              ],
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

export const useUpdateSource = (sourceId: number) => {
  const queryClient = useQueryClient();
  return useMutation<SourceWithTopics, Error, UpdateSourceRequest>({
    mutationFn: async (input) => {
      const { data } = await apiClient.patch<SourceResponse>(endpoints.source(sourceId), input);
      return data.source;
    },
    // The corrected Source is written straight into the reading page's cached payload, so the
    // header reflects the change without a reload and without refetching the stream under it.
    // The catalog is invalidated rather than patched: its order is derived from the notes.
    onSuccess: (source) => {
      queryClient.setQueryData<SourceDetailResponse>(sourceKeys.detail(sourceId), (previous) =>
        previous ? { ...previous, source } : previous,
      );
      queryClient.invalidateQueries({ queryKey: sourceKeys.list() });
      // A correction can name a Topic that did not exist, so the vocabulary the tagger offers
      // is refetched alongside the Source it was typed on.
      queryClient.invalidateQueries({ queryKey: topicKeys.all });
    },
  });
};

export const useDeleteSource = () => {
  const queryClient = useQueryClient();
  return useMutation<void, Error, number>({
    mutationFn: async (sourceId) => {
      await apiClient.delete(endpoints.source(sourceId));
    },
    // The Source's Literature notes went with it (#70), so its reading-page payload is
    // dropped outright rather than patched - nothing is left for that page to show.
    onSuccess: (_result, sourceId) => {
      queryClient.removeQueries({ queryKey: sourceKeys.detail(sourceId) });
      queryClient.invalidateQueries({ queryKey: sourceKeys.list() });
    },
  });
};

export interface UpdateLiteratureNoteVariables {
  noteId: number;
  input: UpdateLiteratureNoteRequest;
}

// The note's correction endpoint, whose payload is the whole note rather than a patch of one
// field. Exported because Review corrects a note too - it clears an open question - and the
// endpoint and its payload shape should be stated in one place even though the two callers
// have nothing to say to the same caches afterwards.
export const correctLiteratureNote = async (
  noteId: number,
  input: UpdateLiteratureNoteRequest,
): Promise<LiteratureNote> => {
  const { data } = await apiClient.patch<LiteratureNoteResponse>(endpoints.note(noteId), input);
  return data.note;
};

// What a note's fields look like as a correction of itself, so a caller changing one of them
// does not have to restate the rest.
export const asCorrection = (
  note: LiteratureNote,
  changes: Partial<UpdateLiteratureNoteRequest> = {},
): UpdateLiteratureNoteRequest => ({
  body: note.body,
  section: note.section,
  position: note.position,
  excerpt: note.excerpt,
  openQuestion: note.openQuestion,
  ...changes,
});

export const useUpdateLiteratureNote = (sourceId: number) => {
  const queryClient = useQueryClient();
  return useMutation<LiteratureNote, Error, UpdateLiteratureNoteVariables>({
    mutationFn: ({ noteId, input }) => correctLiteratureNote(noteId, input),
    // The corrected card replaces itself in place: the stream keeps its order, which is the
    // order the notes were written in and never a function of when they were last touched
    // (#68). A corrected section joins the tab's suggestions as a filed one does.
    onSuccess: (note) => {
      queryClient.setQueryData<SourceDetailResponse>(sourceKeys.detail(sourceId), (previous) => {
        if (!previous) return previous;
        // The correction carries the note's own fields; its connections are not part of what
        // was corrected, so the card keeps the ones it was already read with.
        const notes = previous.notes.map((filed) =>
          filed.id === note.id ? { ...note, connections: filed.connections } : filed,
        );
        return { ...previous, notes, sections: sectionSuggestions(notes) };
      });
    },
  });
};

export const useDeleteLiteratureNote = (sourceId: number) => {
  const queryClient = useQueryClient();
  return useMutation<void, Error, number>({
    mutationFn: async (noteId) => {
      await apiClient.delete(endpoints.note(noteId));
    },
    // The card leaves the stream without a reload, and the tab's suggestions are recomputed
    // from what is left: a section no note uses any more is no longer a suggestion.
    onSuccess: (_result, noteId) => {
      queryClient.setQueryData<SourceDetailResponse>(sourceKeys.detail(sourceId), (previous) => {
        if (!previous) return previous;
        const notes = previous.notes.filter((note) => note.id !== noteId);
        return { ...previous, notes, sections: sectionSuggestions(notes) };
      });
      // The catalog's order and each card's note count are derived from the notes, so a
      // deleted note changes the whole list rather than one entry of it.
      queryClient.invalidateQueries({ queryKey: sourceKeys.list() });
    },
  });
};
