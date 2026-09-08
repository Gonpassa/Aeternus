import { useCallback, useRef, useState } from 'react';
import type { Editor } from '@tiptap/react';
import type { AnchorWithBeats, Dream, EmotionalBeat } from '@nee3/shared-types';
import {
  useCreateAnchor,
  useCreateEmotionalBeat,
  useDeleteAnchor,
  useDeleteEmotionalBeat,
  useUpdateDream,
  useUpdateEmotionalBeat,
} from '../../api/dreamHooks.ts';
import { AnchorMark, anchorIdsInDocument, anchorIdsInRange } from '../../tiptap/AnchorMark.ts';
import { computeMissingAnchorIds } from './DreamAnalysis.utils.ts';
import { AnchorToolbar } from './AnchorToolbar.tsx';
import { EmotionalBeatDialog } from './EmotionalBeatDialog.tsx';
import { EmotionalBeatsList } from './EmotionalBeatsList.tsx';
import { Button } from '../../../../atoms/Button/Button.tsx';
import { Dialog } from '../../../../atoms/Dialog/Dialog.tsx';
import { useDialogState } from '../../../../atoms/Dialog/useDialogState.ts';
import { RichTextEditor } from '../../../../atoms/RichTextEditor/RichTextEditor.tsx';
import { Stack } from '../../../../atoms/Stack/Stack.tsx';
import { Text } from '../../../../atoms/Text/Text.tsx';

// Stable reference - useEditor re-initializes the editor whenever the extensions array
// identity changes, so this must not be recreated on every render.
const ANCHOR_EXTENSIONS = [AnchorMark];

export interface DreamAnalysisProps {
  dream: Dream;
  anchors: AnchorWithBeats[];
}

interface SelectionRange {
  from: number;
  to: number;
}

export function DreamAnalysis({ dream, anchors }: DreamAnalysisProps) {
  const editorRef = useRef<Editor | null>(null);
  const [narrative, setNarrative] = useState(dream.narrative);
  const [selectionRect, setSelectionRect] = useState<DOMRect | null>(null);
  const [selectionRange, setSelectionRange] = useState<SelectionRange | null>(null);
  const [overlappingAnchorId, setOverlappingAnchorId] = useState<number | null>(null);
  const [composerOpen, setComposerOpen] = useState(false);
  const [editingBeat, setEditingBeat] = useState<EmotionalBeat | null>(null);
  const [missingAnchorIds, setMissingAnchorIds] = useState<number[] | null>(null);
  const deleteWarningDialog = useDialogState();

  const updateDream = useUpdateDream(dream.id);
  const createAnchor = useCreateAnchor(dream.id);
  const deleteAnchor = useDeleteAnchor(dream.id);
  const createEmotionalBeat = useCreateEmotionalBeat(dream.id);
  const updateEmotionalBeat = useUpdateEmotionalBeat(dream.id);
  const deleteEmotionalBeat = useDeleteEmotionalBeat(dream.id);

  const clearSelectionState = () => {
    setSelectionRect(null);
    setSelectionRange(null);
    setOverlappingAnchorId(null);
  };

  const handleSelectionUpdate = useCallback((editor: Editor) => {
    const { from, to } = editor.state.selection;
    if (from === to) {
      setSelectionRect(null);
      setSelectionRange(null);
      setOverlappingAnchorId(null);
      return;
    }
    const domSelection = window.getSelection();
    const range = domSelection && domSelection.rangeCount > 0 ? domSelection.getRangeAt(0) : null;
    const rect = range?.getBoundingClientRect() ?? null;
    setSelectionRect(rect && rect.width > 0 ? rect : null);
    setSelectionRange({ from, to });
    setOverlappingAnchorId(anchorIdsInRange(editor, from, to)[0] ?? null);
  }, []);

  const handleCreateBeat = async (label: string) => {
    let anchorId = overlappingAnchorId;
    let createdAnchorId: number | null = null;
    if (anchorId === null) {
      const anchor = await createAnchor.mutateAsync();
      anchorId = anchor.id;
      createdAnchorId = anchor.id;
      const editor = editorRef.current;
      if (editor && selectionRange) {
        editor.chain().setTextSelection(selectionRange).setMark('anchor', { anchorId }).run();
        setNarrative(editor.getHTML());
      }
    }
    try {
      await createEmotionalBeat.mutateAsync({ anchorId, input: { label } });
    } catch (error) {
      // A freshly-created Anchor must never persist without the attachment that justified
      // it (see CONTEXT.md's Anchor definition) - if the beat failed, undo both the Anchor
      // row and the mark just applied to the editor, then let the caller's own catch
      // (EmotionalBeatDialog) handle leaving the dialog open for a retry.
      if (createdAnchorId !== null) {
        const editor = editorRef.current;
        if (editor && selectionRange) {
          editor.chain().setTextSelection(selectionRange).unsetMark('anchor').run();
          setNarrative(editor.getHTML());
        }
        await deleteAnchor.mutateAsync(createdAnchorId).catch(() => {});
      }
      throw error;
    }
    setComposerOpen(false);
    clearSelectionState();
  };

  const handleUpdateBeat = async (label: string) => {
    if (!editingBeat) return;
    await updateEmotionalBeat.mutateAsync({ id: editingBeat.id, input: { label } });
    setEditingBeat(null);
  };

  const handleSave = async () => {
    const editor = editorRef.current;
    if (!editor) return;
    const presentIds = anchorIdsInDocument(editor);
    const knownIds = anchors.map((anchor) => anchor.id);
    const missing = computeMissingAnchorIds(knownIds, presentIds);
    if (missing.length > 0) {
      setMissingAnchorIds(missing);
      deleteWarningDialog.openDialog();
      return;
    }
    await updateDream.mutateAsync({ date: dream.date, narrative: editor.getHTML() });
  };

  const confirmSaveWithDeletions = async () => {
    if (!missingAnchorIds) return;
    await Promise.all(missingAnchorIds.map((id) => deleteAnchor.mutateAsync(id)));
    const editor = editorRef.current;
    if (editor) {
      await updateDream.mutateAsync({ date: dream.date, narrative: editor.getHTML() });
    }
    setMissingAnchorIds(null);
    deleteWarningDialog.closeDialog();
  };

  const lostBeatsCount = (missingAnchorIds ?? []).reduce((total, id) => {
    const anchor = anchors.find((candidate) => candidate.id === id);
    return total + (anchor?.emotionalBeats.length ?? 0);
  }, 0);

  return (
    <Stack direction="column" gap="6">
      <RichTextEditor
        ref={editorRef}
        value={narrative}
        onChange={setNarrative}
        extraExtensions={ANCHOR_EXTENSIONS}
        onSelectionUpdate={handleSelectionUpdate}
        placeholder="Revisit the dream..."
      />
      <AnchorToolbar rect={selectionRect} onAddEmotionalBeat={() => setComposerOpen(true)} />

      <EmotionalBeatsList
        anchors={anchors}
        onEdit={setEditingBeat}
        onDelete={(id) => deleteEmotionalBeat.mutate(id)}
      />

      <Stack justify="flex-end">
        <Button type="button" onClick={handleSave} loading={updateDream.isPending}>
          Save narrative
        </Button>
      </Stack>

      <EmotionalBeatDialog
        open={composerOpen}
        title="Add an emotional beat"
        onClose={() => setComposerOpen(false)}
        onSubmit={handleCreateBeat}
      />
      <EmotionalBeatDialog
        open={editingBeat !== null}
        title="Edit emotional beat"
        initialLabel={editingBeat?.label}
        onClose={() => setEditingBeat(null)}
        onSubmit={handleUpdateBeat}
      />

      <Dialog
        open={deleteWarningDialog.open}
        onClose={() => {
          setMissingAnchorIds(null);
          deleteWarningDialog.closeDialog();
        }}
        variant="small"
        role="alertdialog"
        header={{ title: 'Delete anchored passages?' }}
        footer={{
          secondary: {
            label: 'Cancel',
            onClick: () => {
              setMissingAnchorIds(null);
              deleteWarningDialog.closeDialog();
            },
          },
          primary: {
            label: 'Delete and save',
            variant: 'destructive',
            onClick: confirmSaveWithDeletions,
          },
        }}
      >
        <Text fontFamily="body" color="inkSoft">
          The text you removed carried {(missingAnchorIds ?? []).length}{' '}
          {(missingAnchorIds ?? []).length === 1 ? 'anchor' : 'anchors'} and {lostBeatsCount}{' '}
          {lostBeatsCount === 1 ? 'emotional beat' : 'emotional beats'}. Saving will delete them
          permanently.
        </Text>
      </Dialog>
    </Stack>
  );
}
