import { useState } from 'react';
import { Dialog } from '../../../../../../atoms/Dialog/Dialog.tsx';
import { Text } from '../../../../../../atoms/Text/Text.tsx';

export interface DeleteNoteDialogProps {
  open: boolean;
  locator: string;
  onClose: () => void;
  onConfirm: () => Promise<void>;
}

// A note is deleted outright rather than archived, so the one chance to think again is here.
// The Locator is named rather than the body quoted: it is what the card is filed under, and it
// is what the user is looking at while they decide.
export function DeleteNoteDialog({ open, locator, onClose, onConfirm }: DeleteNoteDialogProps) {
  const [deleting, setDeleting] = useState(false);

  const handleConfirm = async () => {
    setDeleting(true);
    try {
      await onConfirm();
      onClose();
    } catch {
      // The global toast interceptor in api/client.ts already surfaced the failure; leave the
      // dialog open so the user can retry (see RemoveNoteDialog for the pattern).
    } finally {
      setDeleting(false);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      variant="small"
      role="alertdialog"
      header={{ title: 'Delete this note?' }}
      footer={{
        secondary: { label: 'Cancel', onClick: onClose },
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
    </Dialog>
  );
}
