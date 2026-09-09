import { useRef, useState } from 'react';
import type { Editor } from '@tiptap/react';
import type { AnchorWithAttachments, CreateDreamRequest, Dream } from '@nee3/shared-types';
import { useDeleteAnchor, useUpdateDream } from '../../api/dreamHooks.ts';
import { AnchorMark, anchorIdsInDocument } from '../../tiptap/AnchorMark.ts';
import { computeMissingAnchorIds } from './DreamEdit.utils.ts';
import { DreamForm } from '../DreamForm/DreamForm.tsx';
import { Dialog } from '../../../../atoms/Dialog/Dialog.tsx';
import { useDialogState } from '../../../../atoms/Dialog/useDialogState.ts';
import { Text } from '../../../../atoms/Text/Text.tsx';

// Stable reference - useEditor re-initializes the editor whenever the extensions array
// identity changes, so this must not be recreated on every render.
const ANCHOR_EXTENSIONS = [AnchorMark];

export interface DreamEditProps {
  dream: Dream;
  anchors: AnchorWithAttachments[];
  onSaved: () => void;
  onCancel?: () => void;
}

const countLabel = (count: number, singular: string, plural: string) =>
  `${count} ${count === 1 ? singular : plural}`;

// The dedicated narrative-editing page for a recorded Dream, split off the (now read-only)
// Analysis page. Owns the on-save anchor diff: deleting anchored text warns about the
// annotations that would go with it and cascade-deletes the orphaned Anchors on confirm
// (anchored analysis passes survive, degrading to whole-dream readings - see the backend
// schema note on analysis_passes.anchor_id).
export function DreamEdit({ dream, anchors, onSaved, onCancel }: DreamEditProps) {
  const editorRef = useRef<Editor | null>(null);
  const [pendingInput, setPendingInput] = useState<CreateDreamRequest | null>(null);
  const [missingAnchorIds, setMissingAnchorIds] = useState<number[] | null>(null);
  const deleteWarningDialog = useDialogState();

  const updateDream = useUpdateDream(dream.id);
  const deleteAnchor = useDeleteAnchor(dream.id);

  const handleSubmit = async (input: CreateDreamRequest) => {
    const editor = editorRef.current;
    if (editor) {
      const presentIds = anchorIdsInDocument(editor);
      const knownIds = anchors.map((anchor) => anchor.id);
      const missing = computeMissingAnchorIds(knownIds, presentIds);
      if (missing.length > 0) {
        setPendingInput(input);
        setMissingAnchorIds(missing);
        deleteWarningDialog.openDialog();
        return;
      }
    }
    await updateDream.mutateAsync(input);
    onSaved();
  };

  const closeWarning = () => {
    setPendingInput(null);
    setMissingAnchorIds(null);
    deleteWarningDialog.closeDialog();
  };

  const confirmSaveWithDeletions = async () => {
    if (!pendingInput || !missingAnchorIds) return;
    await Promise.all(missingAnchorIds.map((id) => deleteAnchor.mutateAsync(id)));
    await updateDream.mutateAsync(pendingInput);
    closeWarning();
    onSaved();
  };

  const missingAnchors = anchors.filter((anchor) => (missingAnchorIds ?? []).includes(anchor.id));
  const lostBeatsCount = missingAnchors.reduce(
    (total, anchor) => total + anchor.emotionalBeats.length,
    0,
  );
  const lostSymbolTagsCount = missingAnchors.reduce(
    (total, anchor) => total + anchor.symbolAttachments.length,
    0,
  );

  return (
    <>
      <DreamForm
        onSubmit={handleSubmit}
        onDiscard={onCancel}
        initialValues={{ date: dream.date, narrative: dream.narrative }}
        submitLabel="Save narrative"
        extraExtensions={ANCHOR_EXTENSIONS}
        editorRef={editorRef}
      />

      <Dialog
        open={deleteWarningDialog.open}
        onClose={closeWarning}
        variant="small"
        role="alertdialog"
        header={{ title: 'Delete anchored passages?' }}
        footer={{
          secondary: { label: 'Cancel', onClick: closeWarning },
          primary: {
            label: 'Delete and save',
            variant: 'destructive',
            onClick: confirmSaveWithDeletions,
          },
        }}
      >
        <Text fontFamily="body" color="inkSoft">
          The text you removed carried {countLabel(missingAnchors.length, 'anchor', 'anchors')} with{' '}
          {countLabel(lostBeatsCount, 'emotional beat', 'emotional beats')} and{' '}
          {countLabel(lostSymbolTagsCount, 'symbol tag', 'symbol tags')}. Saving will delete them
          permanently.
        </Text>
      </Dialog>
    </>
  );
}
