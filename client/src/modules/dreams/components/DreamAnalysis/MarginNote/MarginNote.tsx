import { useEffect, useRef, useState } from 'react';
import { Trash2, X } from 'lucide-react';
import type { AnchorWithAttachments } from '@nee3/shared-types';
import { Button } from '../../../../../atoms/Button/Button.tsx';
import { Dot } from '../../../../../atoms/Dot/Dot.tsx';
import { IconButton } from '../../../../../atoms/IconButton/IconButton.tsx';
import { RuledNote } from '../../../../../atoms/RuledNote/RuledNote.tsx';
import { Stack } from '../../../../../atoms/Stack/Stack.tsx';
import { Text } from '../../../../../atoms/Text/Text.tsx';
import { useAnchorAttachmentsContext } from '../AnchorAttachmentsContext.tsx';
import { truncateExcerpt } from '../DreamAnalysis.utils.ts';
import { SymbolAutocompleteInput } from '../SymbolAutocompleteInput/SymbolAutocompleteInput.tsx';
import { AssociationForm } from './AssociationForm/AssociationForm.tsx';
import { AssociationsList } from './AssociationsList/AssociationsList.tsx';
import { BeatForm } from './BeatForm/BeatForm.tsx';
import { RemoveNoteDialog } from './RemoveNoteDialog/RemoveNoteDialog.tsx';
import { SymbolAttachmentItem } from './SymbolAttachmentItem/SymbolAttachmentItem.tsx';

export interface MarginNoteProps {
  anchor: AnchorWithAttachments;
  excerpt: string;
}

// One Anchor's margin annotations: the anchored excerpt, its Emotional beats and Symbol
// tags (with nested Associations), and - while this anchor is active - the inline forms
// and affordances to add more.
//
// Only what varies per note is a prop; the handlers and the active/open-form state, which
// are the same for every note in the column, come from AnchorAttachmentsContext.
export function MarginNote({ anchor, excerpt }: MarginNoteProps) {
  const {
    activeAnchorId,
    toggleAnchor,
    form,
    openForm,
    closeForm,
    symbolVocabulary,
    addBeat,
    editBeat,
    deleteBeat,
    tagSymbol,
    addAssociation,
    removeNote,
  } = useAnchorAttachmentsContext();
  const noteRef = useRef<HTMLDivElement>(null);
  // Per-note, so it stays local rather than joining the one-at-a-time form state: the
  // confirmation belongs to the note the user is removing, not to the margin.
  const [removeDialogOpen, setRemoveDialogOpen] = useState(false);
  const active = anchor.id === activeAnchorId;
  const beatFormOpen = form?.kind === 'addBeat' && form.anchorId === anchor.id;
  const symbolFormOpen = form?.kind === 'addSymbol' && form.anchorId === anchor.id;
  const associationFormOpen =
    form?.kind === 'addAssociation' &&
    form.anchorId === anchor.id &&
    form.symbolAttachmentId === null;

  // Notes sit in document order rather than level with their passage (ADR-0008), so a
  // note activated from the manuscript can be off-screen. Bring it into view - 'nearest'
  // so a note already visible (the common case, and every activation from the note
  // itself) doesn't move the page.
  useEffect(() => {
    if (active) noteRef.current?.scrollIntoView?.({ behavior: 'smooth', block: 'nearest' });
  }, [active]);

  return (
    <RuledNote ref={noteRef} rule={active ? 'rust' : 'hairline'}>
      <Button
        type="button"
        variant="ghost"
        justifyContent="flex-start"
        h="auto"
        px="0"
        py="0"
        whiteSpace="normal"
        textAlign="left"
        textStyle="label"
        fontWeight="normal"
        color="inkSoft"
        _hover={{ color: 'ink', bg: 'transparent' }}
        aria-label={`Highlight anchored passage ${truncateExcerpt(excerpt)}`}
        onClick={() => toggleAnchor(anchor.id)}
      >
        “{truncateExcerpt(excerpt)}”
      </Button>

      {anchor.emotionalBeats.map((beat) => (
        <Stack key={beat.id} direction="row" align="center" gap="2" mt="1">
          <Dot color="rust" flexShrink={0} />
          <Text as="span" textStyle="body" fontSize="sm" fontStyle="italic">
            {beat.label}
          </Text>
          {active && (
            <>
              <Button
                type="button"
                size="xs"
                variant="ghost"
                aria-label={`Edit emotional beat ${beat.label}`}
                onClick={() => editBeat(beat)}
              >
                Edit
              </Button>
              <IconButton
                type="button"
                icon={X}
                size="xs"
                variant="ghost"
                color="rust"
                aria-label={`Delete emotional beat ${beat.label}`}
                onClick={() => deleteBeat(beat.id)}
              />
            </>
          )}
        </Stack>
      ))}

      {/* Anchor-level Associations render above the Symbol tags, matching the order the
          analysis actually happens: passage, raw associations, then named symbols
          (issue #52). */}
      <AssociationsList associations={anchor.associations} active={active} />

      {anchor.symbolAttachments.map((attachment) => (
        <SymbolAttachmentItem key={attachment.id} attachment={attachment} active={active} />
      ))}

      {beatFormOpen && (
        <BeatForm onSubmit={(label) => addBeat(anchor.id, label)} onCancel={closeForm} />
      )}
      {symbolFormOpen && (
        <Stack direction="column" mt="1" align="stretch">
          <SymbolAutocompleteInput
            vocabulary={symbolVocabulary}
            onSubmit={(name) => tagSymbol(anchor.id, name)}
            onCancel={closeForm}
          />
        </Stack>
      )}
      {associationFormOpen && (
        <AssociationForm
          submitLabel="Add"
          onSubmit={(content, kind) => addAssociation(anchor.id, null, content, kind)}
          onCancel={closeForm}
        />
      )}

      {active && !form && (
        <Stack direction="row" gap="1" mt="1">
          <Button
            type="button"
            size="xs"
            variant="ghost"
            onClick={() => openForm({ kind: 'addBeat', anchorId: anchor.id })}
          >
            + beat
          </Button>
          <Button
            type="button"
            size="xs"
            variant="ghost"
            onClick={() => openForm({ kind: 'addSymbol', anchorId: anchor.id })}
          >
            + symbol
          </Button>
          <Button
            type="button"
            size="xs"
            variant="ghost"
            aria-label={`Add association to ${truncateExcerpt(excerpt)}`}
            onClick={() =>
              openForm({ kind: 'addAssociation', anchorId: anchor.id, symbolAttachmentId: null })
            }
          >
            + association
          </Button>
          <IconButton
            type="button"
            icon={Trash2}
            size="xs"
            variant="ghost"
            color="rust"
            ml="auto"
            aria-label={`Remove note on ${truncateExcerpt(excerpt)}`}
            onClick={() => setRemoveDialogOpen(true)}
          />
        </Stack>
      )}

      <RemoveNoteDialog
        open={removeDialogOpen}
        anchor={anchor}
        excerpt={truncateExcerpt(excerpt)}
        onClose={() => setRemoveDialogOpen(false)}
        onConfirm={() => removeNote(anchor.id)}
      />
    </RuledNote>
  );
}
