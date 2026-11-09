import { useState } from 'react';
import { Dialog } from '../../../../../../atoms/Dialog/Dialog.tsx';
import { Text } from '../../../../../../atoms/Text/Text.tsx';
import { serverMessage } from '../../../../utils/serverMessage.ts';

export interface DeleteNoteDialogProps {
  open: boolean;
  locator: string;
  onClose: () => void;
  onConfirm: () => Promise<void>;
}

// A note is deleted outright rather than archived, so the one chance to think again is here.
// The Locator is named rather than the body quoted: it is what the card is filed under, and it
// is what the user is looking at while they decide.
//
// A deletion that would leave a Permanent note with no Links at all is refused by the server,
// and the refusal names that note (ADR 0014). It is not a warning this dialog could carry,
// because it is not the user's to confirm - so it is shown here, where the deletion was asked
// for, with the dialog left open so the ideas it names are still in view (#86).
export function DeleteNoteDialog({ open, locator, onClose, onConfirm }: DeleteNoteDialogProps) {
  const [deleting, setDeleting] = useState(false);
  const [refusal, setRefusal] = useState<string | null>(null);

  const handleConfirm = async () => {
    setDeleting(true);
    setRefusal(null);
    try {
      await onConfirm();
      onClose();
    } catch (error) {
      setRefusal(serverMessage(error, 'That note could not be deleted just now.'));
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
      header={{ title: 'Delete this note?' }}
      footer={{
        secondary: { label: 'Cancel', onClick: close },
        primary: {
          label: 'Delete note',
          variant: 'destructive',
          onClick: handleConfirm,
          loading: deleting,
        },
      }}
    >
      <Text textStyle="body">
        The card filed under {locator ? `“${locator}”` : 'this Locator'} leaves the stream for good.
        The Source itself, and everything else written from it, is untouched.
      </Text>
      {refusal !== null && (
        <Text variant="formError" role="alert" mt="3">
          {refusal}
        </Text>
      )}
    </Dialog>
  );
}
