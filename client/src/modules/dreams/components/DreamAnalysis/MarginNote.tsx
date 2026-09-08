import type {
  AnchorWithAttachments,
  Association,
  AssociationKind,
  EmotionalBeat,
} from '@nee3/shared-types';
import { Button } from '../../../../atoms/Button/Button.tsx';
import { Dot } from '../../../../atoms/Dot/Dot.tsx';
import { RuledNote } from '../../../../atoms/RuledNote/RuledNote.tsx';
import { Stack } from '../../../../atoms/Stack/Stack.tsx';
import { Text } from '../../../../atoms/Text/Text.tsx';
import { BeatForm } from './BeatForm.tsx';
import { truncateExcerpt } from './DreamAnalysis.utils.ts';
import type { MarginFormState } from './MarginNote.types.ts';
import { SymbolAttachmentItem } from './SymbolAttachmentItem.tsx';
import { SymbolAutocompleteInput } from './SymbolAutocompleteInput.tsx';

export interface MarginNoteProps {
  anchor: AnchorWithAttachments;
  excerpt: string;
  active: boolean;
  form: MarginFormState | null;
  symbolVocabulary: string[];
  // Vertical offset when the margin column lays notes out absolutely alongside the
  // manuscript; undefined in the narrow-viewport stacked list.
  top?: number;
  noteRef?: (element: HTMLDivElement | null) => void;
  onActivate: () => void;
  onOpenForm: (form: MarginFormState) => void;
  onCloseForm: () => void;
  onAddBeat: (label: string) => Promise<void>;
  onEditBeat: (beat: EmotionalBeat) => void;
  onDeleteBeat: (beatId: number) => void;
  onTagSymbol: (name: string) => Promise<void>;
  onUntagSymbol: (symbolAttachmentId: number) => void;
  onAddAssociation: (
    symbolAttachmentId: number,
    content: string,
    kind: AssociationKind,
  ) => Promise<void>;
  onUpdateAssociation: (
    association: Association,
    content: string,
    kind: AssociationKind,
  ) => Promise<void>;
  onDeleteAssociation: (associationId: number) => void;
}

// One Anchor's margin annotations: the anchored excerpt, its Emotional beats and Symbol
// tags (with nested Associations), and - while this anchor is active - the inline forms
// and affordances to add more.
export function MarginNote({
  anchor,
  excerpt,
  active,
  form,
  symbolVocabulary,
  top,
  noteRef,
  onActivate,
  onOpenForm,
  onCloseForm,
  onAddBeat,
  onEditBeat,
  onDeleteBeat,
  onTagSymbol,
  onUntagSymbol,
  onAddAssociation,
  onUpdateAssociation,
  onDeleteAssociation,
}: MarginNoteProps) {
  const positioned = top !== undefined;
  const beatFormOpen = form?.kind === 'addBeat' && form.anchorId === anchor.id;
  const symbolFormOpen = form?.kind === 'addSymbol' && form.anchorId === anchor.id;

  return (
    <RuledNote
      ref={noteRef}
      rule={active ? 'rust' : 'hairline'}
      position={positioned ? 'absolute' : undefined}
      top={positioned ? `${top}px` : undefined}
      left={positioned ? '0' : undefined}
      right={positioned ? '0' : undefined}
    >
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
        onClick={onActivate}
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
                onClick={() => onEditBeat(beat)}
              >
                Edit
              </Button>
              <Button
                type="button"
                size="xs"
                variant="ghost"
                color="rust"
                aria-label={`Delete emotional beat ${beat.label}`}
                onClick={() => onDeleteBeat(beat.id)}
              >
                ×
              </Button>
            </>
          )}
        </Stack>
      ))}

      {anchor.symbolAttachments.map((attachment) => (
        <SymbolAttachmentItem
          key={attachment.id}
          attachment={attachment}
          active={active}
          form={form}
          onOpenForm={onOpenForm}
          onCloseForm={onCloseForm}
          onUntag={() => onUntagSymbol(attachment.id)}
          onAddAssociation={(content, kind) => onAddAssociation(attachment.id, content, kind)}
          onUpdateAssociation={onUpdateAssociation}
          onDeleteAssociation={onDeleteAssociation}
        />
      ))}

      {beatFormOpen && <BeatForm onSubmit={onAddBeat} onCancel={onCloseForm} />}
      {symbolFormOpen && (
        <Stack direction="column" mt="1" align="stretch">
          <SymbolAutocompleteInput
            vocabulary={symbolVocabulary}
            onSubmit={onTagSymbol}
            onCancel={onCloseForm}
          />
        </Stack>
      )}

      {active && !form && (
        <Stack direction="row" gap="1" mt="1">
          <Button
            type="button"
            size="xs"
            variant="ghost"
            onClick={() => onOpenForm({ kind: 'addBeat', anchorId: anchor.id })}
          >
            + beat
          </Button>
          <Button
            type="button"
            size="xs"
            variant="ghost"
            onClick={() => onOpenForm({ kind: 'addSymbol', anchorId: anchor.id })}
          >
            + symbol
          </Button>
        </Stack>
      )}
    </RuledNote>
  );
}
