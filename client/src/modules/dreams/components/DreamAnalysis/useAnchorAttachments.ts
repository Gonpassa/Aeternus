import { useCallback, useMemo, useState } from 'react';
import type {
  Anchor,
  AssociationKind,
  CreateAnalysisPassRequest,
  Dream,
  EmotionalBeat,
} from '@nee3/shared-types';
import {
  useCreateAnalysisPass,
  useCreateAnchor,
  useCreateAssociation,
  useCreateEmotionalBeat,
  useDeleteAnchor,
  useDeleteAssociation,
  useDeleteEmotionalBeat,
  useSymbols,
  useTagSymbol,
  useUntagSymbol,
  useUpdateAssociation,
  useUpdateDream,
  useUpdateEmotionalBeat,
} from '../../api/dreamHooks.ts';
import type { AnchorAttachments, MarginFormState } from './AnchorAttachmentsContext.tsx';

export interface AnchorAttachmentsState {
  // What every margin note needs, published through AnchorAttachmentsProvider.
  margin: AnchorAttachments;
  // Anchor lifecycle and narrative persistence, for the pending-selection flow.
  createAnchor: () => Promise<Anchor>;
  deleteAnchor: (anchorId: number) => Promise<void>;
  saveNarrative: (narrative: string) => Promise<void>;
  // Analysis passes, for the composer below the manuscript.
  createPass: (input: CreateAnalysisPassRequest) => Promise<unknown>;
  // The Emotional beat open in the edit dialog. Editing happens in a dialog rather than
  // inline, so it sits outside the margin context.
  editingBeat: EmotionalBeat | null;
  closeBeatEditor: () => void;
  saveEditedBeat: (label: string) => Promise<void>;
  // Highlights an Anchor from outside the margin - the toolbar reusing an overlapped
  // Anchor, or the pending flow that just created one.
  activateAnchor: (anchorId: number) => void;
}

// Every write the Analysis page can make against a Dream's Anchors and their attachments,
// plus the small pieces of UI state those writes settle: which Anchor is highlighted,
// which inline form is open, and which Emotional beat the edit dialog holds.
//
// The margin-facing half is returned pre-assembled as `margin` because it goes straight
// into AnchorAttachmentsContext, which exists so MarginNote and SymbolAttachmentItem stop
// being drilled fifteen props deep.
export function useAnchorAttachments(dream: Dream): AnchorAttachmentsState {
  const [activeAnchorId, setActiveAnchorId] = useState<number | null>(null);
  const [form, setForm] = useState<MarginFormState | null>(null);
  const [editingBeat, setEditingBeat] = useState<EmotionalBeat | null>(null);

  const updateDream = useUpdateDream(dream.id);
  const createAnchor = useCreateAnchor(dream.id);
  const deleteAnchor = useDeleteAnchor(dream.id);
  const createEmotionalBeat = useCreateEmotionalBeat(dream.id);
  const updateEmotionalBeat = useUpdateEmotionalBeat(dream.id);
  const deleteEmotionalBeat = useDeleteEmotionalBeat(dream.id);
  const tagSymbol = useTagSymbol(dream.id);
  const untagSymbol = useUntagSymbol(dream.id);
  const createAssociation = useCreateAssociation(dream.id);
  const updateAssociation = useUpdateAssociation(dream.id);
  const deleteAssociation = useDeleteAssociation(dream.id);
  const createAnalysisPass = useCreateAnalysisPass(dream.id);
  const symbols = useSymbols();

  const symbolVocabulary = useMemo(
    () => (symbols.data ?? []).map((symbol) => symbol.name),
    [symbols.data],
  );

  const closeForm = useCallback(() => setForm(null), []);

  const margin = useMemo<AnchorAttachments>(
    () => ({
      activeAnchorId,
      toggleAnchor: (anchorId) =>
        setActiveAnchorId((current) => (current === anchorId ? null : anchorId)),
      form,
      openForm: setForm,
      closeForm,
      symbolVocabulary,
      addBeat: async (anchorId: number, label: string) => {
        await createEmotionalBeat.mutateAsync({ anchorId, input: { label } });
        closeForm();
      },
      editBeat: setEditingBeat,
      deleteBeat: (beatId: number) => deleteEmotionalBeat.mutate(beatId),
      tagSymbol: async (anchorId: number, name: string) => {
        await tagSymbol.mutateAsync({ anchorId, input: { name } });
        closeForm();
      },
      untagSymbol: (symbolAttachmentId: number) => untagSymbol.mutate(symbolAttachmentId),
      addAssociation: async (
        symbolAttachmentId: number,
        content: string,
        kind: AssociationKind,
      ) => {
        await createAssociation.mutateAsync({ symbolAttachmentId, input: { content, kind } });
        closeForm();
      },
      updateAssociation: async (association, content: string, kind: AssociationKind) => {
        await updateAssociation.mutateAsync({ id: association.id, input: { content, kind } });
        closeForm();
      },
      deleteAssociation: (associationId: number) => deleteAssociation.mutate(associationId),
    }),
    [
      activeAnchorId,
      form,
      closeForm,
      symbolVocabulary,
      createEmotionalBeat,
      deleteEmotionalBeat,
      tagSymbol,
      untagSymbol,
      createAssociation,
      updateAssociation,
      deleteAssociation,
    ],
  );

  return {
    margin,
    createAnchor: () => createAnchor.mutateAsync(),
    deleteAnchor: (anchorId: number) => deleteAnchor.mutateAsync(anchorId),
    saveNarrative: async (narrative: string) => {
      await updateDream.mutateAsync({ date: dream.date, narrative });
    },
    createPass: (input: CreateAnalysisPassRequest) => createAnalysisPass.mutateAsync(input),
    editingBeat,
    closeBeatEditor: () => setEditingBeat(null),
    saveEditedBeat: async (label: string) => {
      if (!editingBeat) return;
      await updateEmotionalBeat.mutateAsync({ id: editingBeat.id, input: { label } });
      setEditingBeat(null);
    },
    activateAnchor: setActiveAnchorId,
  };
}
