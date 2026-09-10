import { useEffect, useMemo, useRef, useState } from 'react';
import type { Editor } from '@tiptap/react';
import type {
  AnalysisPass,
  AnalysisPassType,
  AnchorWithAttachments,
  Dream,
} from '@nee3/shared-types';
import { SelectionToolbar } from '../../../../atoms/SelectionToolbar/SelectionToolbar.tsx';
import { Stack } from '../../../../atoms/Stack/Stack.tsx';
import {
  AnalysisSection,
  PENDING_ANCHOR_OPTION,
  WHOLE_DREAM_OPTION,
} from './AnalysisSection/AnalysisSection.tsx';
import { AnchorAttachmentsProvider } from './AnchorAttachmentsContext.tsx';
import { anchorsInDocumentOrder, parseNarrativeAnchors } from './DreamAnalysis.utils.ts';
import { EmotionalBeatDialog } from './EmotionalBeatDialog/EmotionalBeatDialog.tsx';
import { Manuscript } from './Manuscript/Manuscript.tsx';
import { MarginNote } from './MarginNote/MarginNote.tsx';
import { SymbolTagDialog } from './SymbolTagDialog/SymbolTagDialog.tsx';
import { useAnchorAttachments } from './useAnchorAttachments.ts';
import { useAnchorRemoval } from './useAnchorRemoval.ts';
import { collapseDomSelection, useManuscriptSelection } from './useManuscriptSelection.ts';
import { usePendingAttachment } from './usePendingAttachment.ts';

export interface DreamAnalysisProps {
  dream: Dream;
  anchors: AnchorWithAttachments[];
  analysisPasses: AnalysisPass[];
}

type ToolbarActionKind = 'beat' | 'symbol' | 'note';

// The Analysis page: the dream as a read-only manuscript, its Anchors annotated in the
// margin beside it, and the append-only record of Analytic and Synthetic passes below.
// Selecting a passage offers the three ways to attach something to it.
export function DreamAnalysis({ dream, anchors, analysisPasses }: DreamAnalysisProps) {
  const editorRef = useRef<Editor | null>(null);
  const [narrative, setNarrative] = useState(dream.narrative);
  const [beatDialogOpen, setBeatDialogOpen] = useState(false);
  const [symbolDialogOpen, setSymbolDialogOpen] = useState(false);
  const [tab, setTab] = useState<AnalysisPassType>('analytic');
  const [anchorSelection, setAnchorSelection] = useState(WHOLE_DREAM_OPTION);

  const attachments = useAnchorAttachments(dream);
  const selection = useManuscriptSelection(editorRef);
  const pending = usePendingAttachment({
    editorRef,
    createAnchor: attachments.createAnchor,
    deleteAnchor: attachments.deleteAnchor,
    saveNarrative: attachments.saveNarrative,
    onNarrativeChange: setNarrative,
    onPendingRetired: () =>
      setAnchorSelection((current) =>
        current === PENDING_ANCHOR_OPTION ? WHOLE_DREAM_OPTION : current,
      ),
    onAnchorCreated: attachments.activateAnchor,
  });
  const removeNote = useAnchorRemoval({
    editorRef,
    deleteAnchor: attachments.deleteAnchor,
    saveNarrative: attachments.saveNarrative,
    onNarrativeChange: setNarrative,
  });

  // Removal is the one margin action that needs the editor, which lives here rather than in
  // useAnchorAttachments; completing the value here keeps the margin's context surface whole.
  const margin = useMemo(
    () => ({ ...attachments.margin, removeNote }),
    [attachments.margin, removeNote],
  );

  // The server stays the source of truth for the narrative between attachment flows:
  // refetches can legitimately change it (sanitization altering the saved HTML, an edit
  // from another tab), and without this resync the stale local copy would be written
  // back on the next attachment, silently reverting those changes.
  useEffect(() => {
    setNarrative(dream.narrative);
  }, [dream.narrative]);

  const { excerpts, documentOrder } = useMemo(() => parseNarrativeAnchors(narrative), [narrative]);

  // Margin notes read top-to-bottom with the manuscript, so the column follows the
  // narrative rather than the creation order the API returns (ADR-0008).
  const orderedAnchors = useMemo(
    () => anchorsInDocumentOrder(anchors, documentOrder),
    [anchors, documentOrder],
  );

  const scrollToAnalysis = () => {
    document.getElementById('analysis-section')?.scrollIntoView?.({ behavior: 'smooth' });
  };

  const handleToolbarAction = (kind: ToolbarActionKind) => {
    const editor = editorRef.current;
    if (!editor || !selection.range) return;

    // A selection touching an existing Anchor reuses it - no new Anchor, straight to the
    // reused anchor's margin-note form (or the composer, for an analytic note).
    if (selection.overlappingAnchorId !== null) {
      const anchorId = selection.overlappingAnchorId;
      attachments.activateAnchor(anchorId);
      if (kind === 'beat') attachments.margin.openForm({ kind: 'addBeat', anchorId });
      if (kind === 'symbol') attachments.margin.openForm({ kind: 'addSymbol', anchorId });
      if (kind === 'note') {
        setTab('analytic');
        setAnchorSelection(String(anchorId));
        scrollToAnalysis();
      }
      collapseDomSelection();
      selection.clear();
      return;
    }

    // Fresh selection: park it as pending. The Anchor is created only when the first
    // attachment is submitted (an Anchor must never persist without the attachment that
    // justified it - see CONTEXT.md's Anchor definition).
    pending.park(
      selection.range,
      editor.state.doc.textBetween(selection.range.from, selection.range.to, ' '),
    );
    if (kind === 'beat') setBeatDialogOpen(true);
    if (kind === 'symbol') setSymbolDialogOpen(true);
    if (kind === 'note') {
      setTab('analytic');
      setAnchorSelection(PENDING_ANCHOR_OPTION);
      scrollToAnalysis();
    }
    selection.clear();
  };

  const handlePendingBeat = async (label: string) => {
    await pending.attach((anchorId) => attachments.margin.addBeat(anchorId, label));
    setBeatDialogOpen(false);
  };

  const handlePendingSymbol = async (name: string) => {
    await pending.attach((anchorId) => attachments.margin.tagSymbol(anchorId, name));
    setSymbolDialogOpen(false);
  };

  const handleCreatePass = async (content: string) => {
    if (tab === 'synthetic') {
      await attachments.createPass({ type: 'synthetic', content });
      return;
    }
    if (anchorSelection === PENDING_ANCHOR_OPTION) {
      // pending.clear (called on success inside) resets the picker to whole-dream.
      await pending.attach((anchorId) =>
        attachments.createPass({ type: 'analytic', content, anchorId }),
      );
      return;
    }
    await attachments.createPass({
      type: 'analytic',
      content,
      anchorId: anchorSelection === WHOLE_DREAM_OPTION ? null : Number(anchorSelection),
    });
    setAnchorSelection(WHOLE_DREAM_OPTION);
  };

  return (
    <Stack direction="column" align="stretch">
      {/* Manuscript beside margin from lg up, stacked below that - pure CSS, no
          JavaScript media query (ADR-0008). */}
      <Stack direction={{ base: 'column', lg: 'row' }} gap="8" align="flex-start">
        <Manuscript
          narrative={narrative}
          onNarrativeChange={setNarrative}
          editorRef={editorRef}
          containerRef={selection.manuscriptRef}
          activeAnchorId={attachments.margin.activeAnchorId}
          onAnchorClick={attachments.margin.toggleAnchor}
        />

        <Stack
          direction="column"
          align="stretch"
          w={{ base: 'auto', lg: '20rem' }}
          alignSelf={{ base: 'stretch', lg: 'auto' }}
          flexShrink={0}
          gap="4"
        >
          <AnchorAttachmentsProvider value={margin}>
            {orderedAnchors.map((anchor) => (
              <MarginNote key={anchor.id} anchor={anchor} excerpt={excerpts[anchor.id] ?? ''} />
            ))}
          </AnchorAttachmentsProvider>
        </Stack>
      </Stack>

      <SelectionToolbar
        rect={selection.rect}
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
        pendingExcerpt={pending.excerpt}
        onCreatePass={handleCreatePass}
      />

      <EmotionalBeatDialog
        open={beatDialogOpen}
        title="Add an emotional beat"
        onClose={() => {
          setBeatDialogOpen(false);
          pending.clear();
        }}
        onSubmit={handlePendingBeat}
      />
      <EmotionalBeatDialog
        open={attachments.editingBeat !== null}
        title="Edit emotional beat"
        initialLabel={attachments.editingBeat?.label}
        onClose={attachments.closeBeatEditor}
        onSubmit={attachments.saveEditedBeat}
      />
      <SymbolTagDialog
        open={symbolDialogOpen}
        vocabulary={attachments.margin.symbolVocabulary}
        onClose={() => {
          setSymbolDialogOpen(false);
          pending.clear();
        }}
        onSubmit={handlePendingSymbol}
      />
    </Stack>
  );
}
