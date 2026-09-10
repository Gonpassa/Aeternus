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
import type {
  AnchorAttachmentsWithoutRemoval,
  MarginFormState,
} from './AnchorAttachmentsContext.tsx';

export interface AnchorAttachmentsState {
  // What every margin note needs, bar the removal that needs the editor - DreamAnalysis
  // adds that before publishing this through AnchorAttachmentsProvider.
  margin: AnchorAttachmentsWithoutRemoval;
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

  // Destructured to the one function each hook contributes: it names the call site
  // (`createEmotionalBeat(...)`, not `createEmotionalBeat.mutateAsync(...)`), and it keeps
  // the memo dependencies below stable - a mutation object is a new identity on every
  // pending/success transition, so depending on those would rebuild the context value, and
  // re-render every margin note, each time any one of these mutations ran.
  const { mutateAsync: updateDream } = useUpdateDream(dream.id);
  const { mutateAsync: createAnchor } = useCreateAnchor(dream.id);
  const { mutateAsync: deleteAnchor } = useDeleteAnchor(dream.id);
  const { mutateAsync: createEmotionalBeat } = useCreateEmotionalBeat(dream.id);
  const { mutateAsync: updateEmotionalBeat } = useUpdateEmotionalBeat(dream.id);
  const { mutate: deleteEmotionalBeat } = useDeleteEmotionalBeat(dream.id);
  const { mutateAsync: tagSymbol } = useTagSymbol(dream.id);
  const { mutate: untagSymbol } = useUntagSymbol(dream.id);
  const { mutateAsync: createAssociation } = useCreateAssociation(dream.id);
  const { mutateAsync: updateAssociation } = useUpdateAssociation(dream.id);
  const { mutate: deleteAssociation } = useDeleteAssociation(dream.id);
  const { mutateAsync: createAnalysisPass } = useCreateAnalysisPass(dream.id);
  const { data: symbols } = useSymbols();

  const symbolVocabulary = useMemo(() => (symbols ?? []).map((symbol) => symbol.name), [symbols]);

  const closeForm = useCallback(() => setForm(null), []);

  const margin = useMemo<AnchorAttachmentsWithoutRemoval>(
    () => ({
      activeAnchorId,
      toggleAnchor: (anchorId) =>
        setActiveAnchorId((current) => (current === anchorId ? null : anchorId)),
      form,
      openForm: setForm,
      closeForm,
      symbolVocabulary,
      addBeat: async (anchorId: number, label: string) => {
        await createEmotionalBeat({ anchorId, input: { label } });
        closeForm();
      },
      editBeat: setEditingBeat,
      deleteBeat: deleteEmotionalBeat,
      tagSymbol: async (anchorId: number, name: string) => {
        await tagSymbol({ anchorId, input: { name } });
        closeForm();
      },
      untagSymbol,
      addAssociation: async (
        symbolAttachmentId: number,
        content: string,
        kind: AssociationKind,
      ) => {
        await createAssociation({ symbolAttachmentId, input: { content, kind } });
        closeForm();
      },
      updateAssociation: async (association, content: string, kind: AssociationKind) => {
        await updateAssociation({ id: association.id, input: { content, kind } });
        closeForm();
      },
      deleteAssociation,
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
    createAnchor,
    deleteAnchor,
    saveNarrative: async (narrative: string) => {
      await updateDream({ date: dream.date, narrative });
    },
    createPass: createAnalysisPass,
    editingBeat,
    closeBeatEditor: () => setEditingBeat(null),
    saveEditedBeat: async (label: string) => {
      if (!editingBeat) return;
      await updateEmotionalBeat({ id: editingBeat.id, input: { label } });
      setEditingBeat(null);
    },
    activateAnchor: setActiveAnchorId,
  };
}
