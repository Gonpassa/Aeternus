import { useEffect, useMemo, useRef, useState, type MouseEvent as ReactMouseEvent } from 'react';
import type { Editor } from '@tiptap/react';
import type {
  AnalysisPass,
  AnalysisPassType,
  AnchorWithAttachments,
  Association,
  AssociationKind,
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
import { ANCHOR_MARK_NAME, AnchorMark, anchorIdsInRange } from '../../tiptap/AnchorMark.ts';
import { useMediaQuery } from '../../../../styling/useMediaQuery.ts';
import { RichTextEditor } from '../../../../atoms/RichTextEditor/RichTextEditor.tsx';
import { SelectionToolbar } from '../../../../atoms/SelectionToolbar/SelectionToolbar.tsx';
import { Stack } from '../../../../atoms/Stack/Stack.tsx';
import { AnalysisSection, PENDING_ANCHOR_OPTION, WHOLE_DREAM_OPTION } from './AnalysisSection.tsx';
import { anchorExcerpts } from './DreamAnalysis.utils.ts';
import { EmotionalBeatDialog } from './EmotionalBeatDialog.tsx';
import { MarginNote } from './MarginNote.tsx';
import type { MarginFormState } from './MarginNote.types.ts';
import { SymbolTagDialog } from './SymbolTagDialog.tsx';
import { useMarginNoteLayout } from './useMarginNoteLayout.ts';

// Stable reference - useEditor re-initializes the editor whenever the extensions array
// identity changes, so this must not be recreated on every render.
const ANCHOR_EXTENSIONS = [AnchorMark];

// Below this the margin has no room; notes fall back to a stacked list under the
// manuscript.
const WIDE_VIEWPORT_QUERY = '(min-width: 64em)';

export interface DreamAnalysisProps {
  dream: Dream;
  anchors: AnchorWithAttachments[];
  analysisPasses: AnalysisPass[];
}

interface SelectionRange {
  from: number;
  to: number;
}

type ToolbarActionKind = 'beat' | 'symbol' | 'note';

export function DreamAnalysis({ dream, anchors, analysisPasses }: DreamAnalysisProps) {
  const editorRef = useRef<Editor | null>(null);
  const manuscriptRef = useRef<HTMLDivElement | null>(null);
  const [narrative, setNarrative] = useState(dream.narrative);
  const [selectionRect, setSelectionRect] = useState<DOMRect | null>(null);
  const [selectionRange, setSelectionRange] = useState<SelectionRange | null>(null);
  const [overlappingAnchorId, setOverlappingAnchorId] = useState<number | null>(null);
  const [activeAnchorId, setActiveAnchorId] = useState<number | null>(null);
  const [form, setForm] = useState<MarginFormState | null>(null);
  const [editingBeat, setEditingBeat] = useState<EmotionalBeat | null>(null);
  const [beatDialogOpen, setBeatDialogOpen] = useState(false);
  const [symbolDialogOpen, setSymbolDialogOpen] = useState(false);
  // A selection handed off to a dialog or the pass composer before its Anchor exists -
  // the Anchor is only created when the attachment that justifies it is submitted.
  const [pendingRange, setPendingRange] = useState<SelectionRange | null>(null);
  const [pendingExcerpt, setPendingExcerpt] = useState<string | null>(null);
  const [tab, setTab] = useState<AnalysisPassType>('analytic');
  const [anchorSelection, setAnchorSelection] = useState(WHOLE_DREAM_OPTION);

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

  const isWide = useMediaQuery(WIDE_VIEWPORT_QUERY);

  // The server stays the source of truth for the narrative between attachment flows:
  // refetches can legitimately change it (sanitization altering the saved HTML, an edit
  // from another tab), and without this resync the stale local copy would be written
  // back on the next attachment, silently reverting those changes.
  useEffect(() => {
    setNarrative(dream.narrative);
  }, [dream.narrative]);

  const excerpts = useMemo(() => anchorExcerpts(narrative), [narrative]);
  const symbolVocabulary = useMemo(
    () => (symbols.data ?? []).map((symbol) => symbol.name),
    [symbols.data],
  );

  const anchorIds = useMemo(() => anchors.map((anchor) => anchor.id), [anchors]);
  const layoutKey = useMemo(
    () => [narrative, anchors, form, activeAnchorId],
    [narrative, anchors, form, activeAnchorId],
  );
  const { tops, columnHeight, registerNote } = useMarginNoteLayout({
    manuscriptRef,
    anchorIds,
    enabled: isWide,
    layoutKey,
  });

  const clearSelectionState = () => {
    setSelectionRect(null);
    setSelectionRange(null);
    setOverlappingAnchorId(null);
  };

  // Retires the visual text selection by collapsing it rather than removeAllRanges():
  // an emptied selection never reaches ProseMirror's selectionchange handler, which
  // leaves its DOM-selection cache stale - an identical re-selection of the same passage
  // would then compare equal to the cache and be silently ignored (dead toolbar). A
  // collapse is observed, resyncing both the cache and the editor state selection.
  const collapseDomSelection = () => {
    const domSelection = window.getSelection();
    if (domSelection && domSelection.rangeCount > 0) domSelection.collapseToEnd();
  };

  // Fully abandons a parked pending selection: cancelling its dialog (or completing the
  // flow) must also retire the composer's '(selected passage)' option, or a stale
  // anchorSelection of 'pending' would point at a range the user believed was discarded.
  const clearPendingSelection = () => {
    setPendingRange(null);
    setPendingExcerpt(null);
    setAnchorSelection((current) =>
      current === PENDING_ANCHOR_OPTION ? WHOLE_DREAM_OPTION : current,
    );
    collapseDomSelection();
  };

  // The toolbar tracks the document's native selectionchange event rather than Tiptap's
  // selectionUpdate: ProseMirror keeps a cache of the last DOM selection it observed and
  // silently ignores any new selection that compares equal to it - which happens whenever
  // focus leaves the editor mid-flow (a dialog's focus trap parks the caret in its input)
  // and the user then re-selects the same passage. The native event fires for every user
  // selection unconditionally; PM positions are recovered from the DOM range via posAtDOM.
  useEffect(() => {
    const handleSelectionChange = () => {
      const editor = editorRef.current;
      const manuscript = manuscriptRef.current;
      if (!editor || !manuscript) return;
      const clear = () => {
        setSelectionRect(null);
        setSelectionRange(null);
        setOverlappingAnchorId(null);
      };
      const domSelection = window.getSelection();
      const range =
        domSelection && domSelection.rangeCount > 0 && !domSelection.isCollapsed
          ? domSelection.getRangeAt(0)
          : null;
      if (!range || !manuscript.contains(range.commonAncestorContainer)) {
        clear();
        return;
      }
      try {
        const from = editor.view.posAtDOM(range.startContainer, range.startOffset);
        const to = editor.view.posAtDOM(range.endContainer, range.endOffset);
        if (from < 0 || to < 0 || from === to) {
          clear();
          return;
        }
        setSelectionRect(range.getBoundingClientRect());
        setSelectionRange({ from, to });
        setOverlappingAnchorId(anchorIdsInRange(editor, from, to)[0] ?? null);
      } catch {
        // posAtDOM throws for DOM nodes it cannot map into the document.
        clear();
      }
    };
    document.addEventListener('selectionchange', handleSelectionChange);
    return () => document.removeEventListener('selectionchange', handleSelectionChange);
  }, []);

  // The toolbar's caller-owned dismissal: Escape clears the selection state (outside
  // clicks collapse the selection, which clears it via handleSelectionUpdate).
  useEffect(() => {
    if (!selectionRect) return undefined;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      setSelectionRect(null);
      setSelectionRange(null);
      setOverlappingAnchorId(null);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectionRect]);

  const scrollToAnalysis = () => {
    document.getElementById('analysis-section')?.scrollIntoView?.({ behavior: 'smooth' });
  };

  const handleToolbarAction = (kind: ToolbarActionKind) => {
    const editor = editorRef.current;
    if (!editor || !selectionRange) return;

    // A selection touching an existing Anchor reuses it - no new Anchor, straight to the
    // reused anchor's margin-note form (or the composer, for an analytic note).
    if (overlappingAnchorId !== null) {
      const anchorId = overlappingAnchorId;
      setActiveAnchorId(anchorId);
      if (kind === 'beat') setForm({ kind: 'addBeat', anchorId });
      if (kind === 'symbol') setForm({ kind: 'addSymbol', anchorId });
      if (kind === 'note') {
        setTab('analytic');
        setAnchorSelection(String(anchorId));
        scrollToAnalysis();
      }
      collapseDomSelection();
      clearSelectionState();
      return;
    }

    // Fresh selection: park it as pending. The Anchor is created only when the first
    // attachment is submitted (an Anchor must never persist without the attachment that
    // justified it - see CONTEXT.md's Anchor definition).
    setPendingRange(selectionRange);
    setPendingExcerpt(editor.state.doc.textBetween(selectionRange.from, selectionRange.to, ' '));
    if (kind === 'beat') setBeatDialogOpen(true);
    if (kind === 'symbol') setSymbolDialogOpen(true);
    if (kind === 'note') {
      setTab('analytic');
      setAnchorSelection(PENDING_ANCHOR_OPTION);
      scrollToAnalysis();
    }
    clearSelectionState();
  };

  // Creates the Anchor for the pending selection, runs the attachment, then marks the
  // passage and persists the marked narrative - in that order, so the narrative save is
  // the last step and no failure can leave an anchor span in the stored narrative
  // pointing at a rolled-back Anchor row. Rollback deletes the Anchor (cascading the
  // just-created attachment) before rethrowing so the calling form stays open for retry.
  const attachToPendingSelection = async (attach: (anchorId: number) => Promise<unknown>) => {
    const range = pendingRange;
    if (!range) {
      // The pending selection was consumed by another flow; reject rather than resolve so
      // the caller keeps its input instead of treating this as a successful save.
      throw new Error('The selected passage is no longer available - select it again.');
    }
    const anchor = await createAnchor.mutateAsync();
    try {
      await attach(anchor.id);
    } catch (error) {
      await deleteAnchor.mutateAsync(anchor.id).catch(() => {});
      throw error;
    }
    const editor = editorRef.current;
    if (editor) {
      editor
        .chain()
        .setTextSelection(range)
        .setMark(ANCHOR_MARK_NAME, { anchorId: anchor.id })
        .run();
      const markedNarrative = editor.getHTML();
      setNarrative(markedNarrative);
      try {
        await updateDream.mutateAsync({ date: dream.date, narrative: markedNarrative });
      } catch (error) {
        editor.chain().setTextSelection(range).unsetMark(ANCHOR_MARK_NAME).run();
        setNarrative(editor.getHTML());
        await deleteAnchor.mutateAsync(anchor.id).catch(() => {});
        throw error;
      }
    }
    clearPendingSelection();
    setActiveAnchorId(anchor.id);
  };

  const handlePendingBeat = async (label: string) => {
    await attachToPendingSelection((anchorId) =>
      createEmotionalBeat.mutateAsync({ anchorId, input: { label } }),
    );
    setBeatDialogOpen(false);
  };

  const handlePendingSymbol = async (name: string) => {
    await attachToPendingSelection((anchorId) =>
      tagSymbol.mutateAsync({ anchorId, input: { name } }),
    );
    setSymbolDialogOpen(false);
  };

  const handleCreatePass = async (content: string) => {
    if (tab === 'synthetic') {
      await createAnalysisPass.mutateAsync({ type: 'synthetic', content });
      return;
    }
    if (anchorSelection === PENDING_ANCHOR_OPTION) {
      // clearPendingSelection (called on success inside) resets the picker to whole-dream.
      await attachToPendingSelection((anchorId) =>
        createAnalysisPass.mutateAsync({ type: 'analytic', content, anchorId }),
      );
      return;
    }
    await createAnalysisPass.mutateAsync({
      type: 'analytic',
      content,
      anchorId: anchorSelection === WHOLE_DREAM_OPTION ? null : Number(anchorSelection),
    });
    setAnchorSelection(WHOLE_DREAM_OPTION);
  };

  const handleAddBeat = async (anchorId: number, label: string) => {
    await createEmotionalBeat.mutateAsync({ anchorId, input: { label } });
    setForm(null);
  };

  const handleUpdateBeat = async (label: string) => {
    if (!editingBeat) return;
    await updateEmotionalBeat.mutateAsync({ id: editingBeat.id, input: { label } });
    setEditingBeat(null);
  };

  const handleTagSymbol = async (anchorId: number, name: string) => {
    await tagSymbol.mutateAsync({ anchorId, input: { name } });
    setForm(null);
  };

  const handleAddAssociation = async (
    symbolAttachmentId: number,
    content: string,
    kind: AssociationKind,
  ) => {
    await createAssociation.mutateAsync({ symbolAttachmentId, input: { content, kind } });
    setForm(null);
  };

  const handleUpdateAssociation = async (
    association: Association,
    content: string,
    kind: AssociationKind,
  ) => {
    await updateAssociation.mutateAsync({ id: association.id, input: { content, kind } });
    setForm(null);
  };

  const handleManuscriptClick = (event: ReactMouseEvent<HTMLDivElement>) => {
    const target = event.target as HTMLElement;
    const span = target.closest('span[data-anchor-id]');
    const anchorId = span ? Number(span.getAttribute('data-anchor-id')) : NaN;
    if (!Number.isInteger(anchorId)) return;
    setActiveAnchorId((current) => (current === anchorId ? null : anchorId));
  };

  const renderMarginNote = (anchor: AnchorWithAttachments) => (
    <MarginNote
      key={anchor.id}
      anchor={anchor}
      excerpt={excerpts[anchor.id] ?? ''}
      active={anchor.id === activeAnchorId}
      form={form}
      symbolVocabulary={symbolVocabulary}
      top={isWide ? (tops[anchor.id] ?? 0) : undefined}
      noteRef={(element) => registerNote(anchor.id, element)}
      onActivate={() => setActiveAnchorId((current) => (current === anchor.id ? null : anchor.id))}
      onOpenForm={setForm}
      onCloseForm={() => setForm(null)}
      onAddBeat={(label) => handleAddBeat(anchor.id, label)}
      onEditBeat={setEditingBeat}
      onDeleteBeat={(beatId) => deleteEmotionalBeat.mutate(beatId)}
      onTagSymbol={(name) => handleTagSymbol(anchor.id, name)}
      onUntagSymbol={(symbolAttachmentId) => untagSymbol.mutate(symbolAttachmentId)}
      onAddAssociation={handleAddAssociation}
      onUpdateAssociation={handleUpdateAssociation}
      onDeleteAssociation={(associationId) => deleteAssociation.mutate(associationId)}
    />
  );

  return (
    <Stack direction="column" align="stretch">
      <Stack direction={isWide ? 'row' : 'column'} gap="8" align="flex-start">
        {/* eslint-disable-next-line jsx-a11y/no-static-element-interactions, jsx-a11y/click-events-have-key-events --
            clicking an anchored span is a pointer-only enhancement; the margin note's
            excerpt button is the keyboard-reachable way to activate the same anchor. */}
        <Stack
          ref={manuscriptRef}
          direction="column"
          align="stretch"
          flex="1"
          maxW="42rem"
          alignSelf={isWide ? undefined : 'stretch'}
          position="relative"
          onClick={handleManuscriptClick}
          css={{
            '& span[data-anchor-id]': {
              borderBottomWidth: '1px',
              borderBottomStyle: 'dotted',
              borderBottomColor: 'inkBlue',
              cursor: 'pointer',
            },
            ...(activeAnchorId !== null
              ? {
                  [`& span[data-anchor-id="${activeAnchorId}"]`]: {
                    borderBottomWidth: '2px',
                    borderBottomStyle: 'solid',
                    borderBottomColor: 'rust',
                  },
                }
              : {}),
          }}
        >
          <RichTextEditor
            ref={editorRef}
            readOnly
            value={narrative}
            onChange={setNarrative}
            extraExtensions={ANCHOR_EXTENSIONS}
          />
        </Stack>

        <Stack
          direction="column"
          align="stretch"
          w={isWide ? '20rem' : undefined}
          alignSelf={isWide ? undefined : 'stretch'}
          position={isWide ? 'relative' : undefined}
          // Absolutely-positioned notes contribute no flow height; reserve the measured
          // stack height so a tall column can't overflow onto the Analysis section.
          minH={isWide && anchors.length > 0 ? `${Math.max(columnHeight, 480)}px` : undefined}
          flexShrink={0}
          gap={isWide ? undefined : '4'}
        >
          {anchors.map(renderMarginNote)}
        </Stack>
      </Stack>

      <SelectionToolbar
        rect={selectionRect}
        aria-label="Attach to selected passage"
        actions={[
          { label: 'Add emotional beat', onSelect: () => handleToolbarAction('beat') },
          { label: 'Tag symbol', onSelect: () => handleToolbarAction('symbol') },
          { label: 'Add analytic note', onSelect: () => handleToolbarAction('note') },
        ]}
      />

      <AnalysisSection
        passes={analysisPasses}
        anchors={anchors}
        excerpts={excerpts}
        tab={tab}
        onTabChange={setTab}
        anchorSelection={anchorSelection}
        onAnchorSelectionChange={setAnchorSelection}
        pendingExcerpt={pendingExcerpt}
        onCreatePass={handleCreatePass}
      />

      <EmotionalBeatDialog
        open={beatDialogOpen}
        title="Add an emotional beat"
        onClose={() => {
          setBeatDialogOpen(false);
          clearPendingSelection();
        }}
        onSubmit={handlePendingBeat}
      />
      <EmotionalBeatDialog
        open={editingBeat !== null}
        title="Edit emotional beat"
        initialLabel={editingBeat?.label}
        onClose={() => setEditingBeat(null)}
        onSubmit={handleUpdateBeat}
      />
      <SymbolTagDialog
        open={symbolDialogOpen}
        vocabulary={symbolVocabulary}
        onClose={() => {
          setSymbolDialogOpen(false);
          clearPendingSelection();
        }}
        onSubmit={handlePendingSymbol}
      />
    </Stack>
  );
}
