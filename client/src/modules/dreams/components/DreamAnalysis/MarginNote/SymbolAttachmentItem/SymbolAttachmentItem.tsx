import type { SymbolAttachmentDetail } from '@nee3/shared-types';
import { Button } from '../../../../../../atoms/Button/Button.tsx';
import { Stack } from '../../../../../../atoms/Stack/Stack.tsx';
import { useAnchorAttachmentsContext } from '../../AnchorAttachmentsContext.tsx';
import { AssociationForm } from '../AssociationForm/AssociationForm.tsx';
import { AssociationsList } from '../AssociationsList/AssociationsList.tsx';
import { SymbolLabel } from './SymbolLabel/SymbolLabel.tsx';

export interface SymbolAttachmentItemProps {
  attachment: SymbolAttachmentDetail;
  // Whether this attachment's anchor is the active one - edit affordances only then.
  active: boolean;
}

// One Symbol tag inside a margin note: the specimen label, its nested Associations, and
// (while the anchor is active) the affordances to grow or prune them.
export function SymbolAttachmentItem({ attachment, active }: SymbolAttachmentItemProps) {
  const { form, openForm, closeForm, untagSymbol, addAssociation } = useAnchorAttachmentsContext();
  const addFormOpen = form?.kind === 'addAssociation' && form.symbolAttachmentId === attachment.id;

  return (
    <Stack direction="column" gap="1" mt="2" align="stretch">
      <SymbolLabel
        name={attachment.symbolName}
        showRemove={active}
        onRemove={() => untagSymbol(attachment.id)}
      />
      <AssociationsList associations={attachment.associations} active={active} />
      {addFormOpen && (
        <AssociationForm
          submitLabel="Add"
          onSubmit={(content, kind) =>
            addAssociation(attachment.anchorId, attachment.id, content, kind)
          }
          onCancel={closeForm}
        />
      )}
      {active && !addFormOpen && (
        <Stack direction="row">
          <Button
            type="button"
            size="xs"
            variant="ghost"
            aria-label={`Add association to ${attachment.symbolName}`}
            onClick={() =>
              openForm({
                kind: 'addAssociation',
                anchorId: attachment.anchorId,
                symbolAttachmentId: attachment.id,
              })
            }
          >
            + association
          </Button>
        </Stack>
      )}
    </Stack>
  );
}
