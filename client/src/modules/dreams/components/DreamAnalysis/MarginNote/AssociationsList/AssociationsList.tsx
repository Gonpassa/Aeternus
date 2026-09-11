import { X } from 'lucide-react';
import type { Association } from '@nee3/shared-types';
import { Button } from '../../../../../../atoms/Button/Button.tsx';
import { IconButton } from '../../../../../../atoms/IconButton/IconButton.tsx';
import { Stack } from '../../../../../../atoms/Stack/Stack.tsx';
import { Text } from '../../../../../../atoms/Text/Text.tsx';
import { useAnchorAttachmentsContext } from '../../AnchorAttachmentsContext.tsx';
import { AssociationForm } from '../AssociationForm/AssociationForm.tsx';

export interface AssociationsListProps {
  associations: Association[];
  // Whether this list's anchor is the active one - edit affordances only then.
  active: boolean;
}

// A list of Associations - either an Anchor's own or a Symbol tag's - with (while the
// anchor is active) the affordances to edit or delete each one. Shared by MarginNote
// (anchor-level) and SymbolAttachmentItem (symbol-level) so both kinds of Association
// render identically.
export function AssociationsList({ associations, active }: AssociationsListProps) {
  const { form, openForm, closeForm, updateAssociation, deleteAssociation } =
    useAnchorAttachmentsContext();
  const editingAssociation =
    form?.kind === 'editAssociation' &&
    associations.some((candidate) => candidate.id === form.association.id)
      ? form.association
      : null;

  return (
    <>
      {associations.map((association) =>
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
    </>
  );
}
