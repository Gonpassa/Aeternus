import { X } from 'lucide-react';
import type { SymbolAttachmentDetail } from '@nee3/shared-types';
import { Button } from '../../../../../../atoms/Button/Button.tsx';
import { IconButton } from '../../../../../../atoms/IconButton/IconButton.tsx';
import { Stack } from '../../../../../../atoms/Stack/Stack.tsx';
import { Text } from '../../../../../../atoms/Text/Text.tsx';
import { useAnchorAttachmentsContext } from '../../AnchorAttachmentsContext.tsx';
import { AssociationForm } from './AssociationForm/AssociationForm.tsx';
import { SymbolLabel } from './SymbolLabel/SymbolLabel.tsx';

export interface SymbolAttachmentItemProps {
  attachment: SymbolAttachmentDetail;
  // Whether this attachment's anchor is the active one - edit affordances only then.
  active: boolean;
}

// One Symbol tag inside a margin note: the specimen label, its nested Associations, and
// (while the anchor is active) the affordances to grow or prune them.
export function SymbolAttachmentItem({ attachment, active }: SymbolAttachmentItemProps) {
  const {
    form,
    openForm,
    closeForm,
    untagSymbol,
    addAssociation,
    updateAssociation,
    deleteAssociation,
  } = useAnchorAttachmentsContext();
  const addFormOpen = form?.kind === 'addAssociation' && form.symbolAttachmentId === attachment.id;
  const editingAssociation =
    form?.kind === 'editAssociation' &&
    attachment.associations.some((candidate) => candidate.id === form.association.id)
      ? form.association
      : null;

  return (
    <Stack direction="column" gap="1" mt="2" align="stretch">
      <SymbolLabel
        name={attachment.symbolName}
        showRemove={active}
        onRemove={() => untagSymbol(attachment.id)}
      />
      {attachment.associations.map((association) =>
        editingAssociation?.id === association.id ? (
          <AssociationForm
            key={association.id}
            initialContent={association.content}
            initialKind={association.kind}
            submitLabel="Save"
            onSubmit={(content, kind) => updateAssociation(association, content, kind)}
            onCancel={closeForm}
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
                  onClick={() => openForm({ kind: 'editAssociation', association })}
                >
                  Edit
                </Button>
                <IconButton
                  type="button"
                  icon={X}
                  size="xs"
                  variant="ghost"
                  color="rust"
                  aria-label={`Delete association ${association.content}`}
                  onClick={() => deleteAssociation(association.id)}
                />
              </>
            )}
          </Stack>
        ),
      )}
      {addFormOpen && (
        <AssociationForm
          submitLabel="Add"
          onSubmit={(content, kind) => addAssociation(attachment.id, content, kind)}
          onCancel={closeForm}
        />
      )}
      {active && !addFormOpen && (
        <Stack direction="row">
          <Button
            type="button"
            size="xs"
            variant="ghost"
            onClick={() => openForm({ kind: 'addAssociation', symbolAttachmentId: attachment.id })}
          >
            + association
          </Button>
        </Stack>
      )}
    </Stack>
  );
}
