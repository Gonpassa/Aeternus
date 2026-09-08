import type { Association, AssociationKind, SymbolAttachmentDetail } from '@nee3/shared-types';
import { Button } from '../../../../atoms/Button/Button.tsx';
import { Stack } from '../../../../atoms/Stack/Stack.tsx';
import { Text } from '../../../../atoms/Text/Text.tsx';
import { AssociationForm } from './AssociationForm.tsx';
import type { MarginFormState } from './MarginNote.types.ts';
import { SymbolLabel } from './SymbolLabel.tsx';

export interface SymbolAttachmentItemProps {
  attachment: SymbolAttachmentDetail;
  // Whether this attachment's anchor is the active one - edit affordances only then.
  active: boolean;
  form: MarginFormState | null;
  onOpenForm: (form: MarginFormState) => void;
  onCloseForm: () => void;
  onUntag: () => void;
  onAddAssociation: (content: string, kind: AssociationKind) => Promise<void>;
  onUpdateAssociation: (
    association: Association,
    content: string,
    kind: AssociationKind,
  ) => Promise<void>;
  onDeleteAssociation: (associationId: number) => void;
}

// One Symbol tag inside a margin note: the specimen label, its nested Associations, and
// (while the anchor is active) the affordances to grow or prune them.
export function SymbolAttachmentItem({
  attachment,
  active,
  form,
  onOpenForm,
  onCloseForm,
  onUntag,
  onAddAssociation,
  onUpdateAssociation,
  onDeleteAssociation,
}: SymbolAttachmentItemProps) {
  const addFormOpen = form?.kind === 'addAssociation' && form.symbolAttachmentId === attachment.id;
  const editingAssociation =
    form?.kind === 'editAssociation' &&
    attachment.associations.some((candidate) => candidate.id === form.association.id)
      ? form.association
      : null;

  return (
    <Stack direction="column" gap="1" mt="2" align="stretch">
      <SymbolLabel name={attachment.symbolName} showRemove={active} onRemove={onUntag} />
      {attachment.associations.map((association) =>
        editingAssociation?.id === association.id ? (
          <AssociationForm
            key={association.id}
            initialContent={association.content}
            initialKind={association.kind}
            submitLabel="Save"
            onSubmit={(content, kind) => onUpdateAssociation(association, content, kind)}
            onCancel={onCloseForm}
          />
        ) : (
          <Stack key={association.id} direction="row" align="baseline" gap="2">
            <Text as="span" textStyle="body" fontSize="sm" color="inkSoft">
              {association.kind === 'cultural' ? '◦' : '•'} {association.content}
            </Text>
            {active && (
              <>
                <Button
                  type="button"
                  size="xs"
                  variant="ghost"
                  aria-label={`Edit association ${association.content}`}
                  onClick={() => onOpenForm({ kind: 'editAssociation', association })}
                >
                  Edit
                </Button>
                <Button
                  type="button"
                  size="xs"
                  variant="ghost"
                  color="rust"
                  aria-label={`Delete association ${association.content}`}
                  onClick={() => onDeleteAssociation(association.id)}
                >
                  ×
                </Button>
              </>
            )}
          </Stack>
        ),
      )}
      {addFormOpen && (
        <AssociationForm submitLabel="Add" onSubmit={onAddAssociation} onCancel={onCloseForm} />
      )}
      {active && !addFormOpen && (
        <Stack direction="row">
          <Button
            type="button"
            size="xs"
            variant="ghost"
            onClick={() =>
              onOpenForm({ kind: 'addAssociation', symbolAttachmentId: attachment.id })
            }
          >
            + association
          </Button>
        </Stack>
      )}
    </Stack>
  );
}
