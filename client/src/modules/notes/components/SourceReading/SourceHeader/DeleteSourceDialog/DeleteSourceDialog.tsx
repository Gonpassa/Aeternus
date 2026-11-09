import { useState } from 'react';
import { Dialog } from '../../../../../../atoms/Dialog/Dialog.tsx';
import { Text } from '../../../../../../atoms/Text/Text.tsx';
import { countLabel } from '../../../../../../utils/countLabel.ts';
import { serverMessage } from '../../../../utils/serverMessage.ts';

export interface DeleteSourceDialogProps {
  open: boolean;
  title: string;
  noteCount: number;
  onClose: () => void;
  onConfirm: () => Promise<void>;
}

// Deleting a Source takes every Literature note written from it (#70), which is more than the
// header shows at a glance - so the confirmation counts them rather than asking "are you
// sure?".
//
// A deletion that would leave a Permanent note with no Links at all is refused by the server,
// across the whole batch of notes this Source cascades to, and the refusal names every idea it
// is protecting (ADR 0014). That is the one case the count above cannot warn about: the notes it
// names were written elsewhere, long after, and are nowhere on this page - so the refusal is
// shown here and the dialog stays open with them in view (#86).
export function DeleteSourceDialog({
  open,
  title,
  noteCount,
  onClose,
  onConfirm,
}: DeleteSourceDialogProps) {
  const [deleting, setDeleting] = useState(false);
  const [refusal, setRefusal] = useState<string | null>(null);

  const handleConfirm = async () => {
    setDeleting(true);
    setRefusal(null);
    try {
      await onConfirm();
      onClose();
    } catch (error) {
      setRefusal(serverMessage(error, 'That Source could not be deleted just now.'));
    } finally {
      setDeleting(false);
    }
  };

  const close = () => {
    setRefusal(null);
    onClose();
  };

  return (
    <Dialog
      open={open}
      onClose={close}
      variant="small"
      role="alertdialog"
      header={{ title: 'Delete this Source?' }}
      footer={{
        secondary: { label: 'Cancel', onClick: close },
        primary: {
          label: 'Delete Source',
          variant: 'destructive',
          onClick: handleConfirm,
          loading: deleting,
        },
      }}
    >
      <Text textStyle="body">
        “{title}” leaves the catalog, and{' '}
        {countLabel(noteCount, 'note written from it goes', 'notes written from it go')} with it.
      </Text>
      {refusal !== null && (
        <Text variant="formError" role="alert" mt="3">
          {refusal}
        </Text>
      )}
    </Dialog>
  );
}
