import { useState } from 'react';
import { Dialog } from '../../../../../../atoms/Dialog/Dialog.tsx';
import { Text } from '../../../../../../atoms/Text/Text.tsx';
import { countLabel } from '../../../../../../utils/countLabel.ts';

export interface DeleteSourceDialogProps {
  open: boolean;
  title: string;
  noteCount: number;
  onClose: () => void;
  onConfirm: () => Promise<void>;
}

// Deleting a Source takes every Literature note written from it (#70), which is more than the
// header shows at a glance - so the confirmation counts them rather than asking "are you
// sure?". Once Permanent notes exist, a deletion that would orphan an idea is refused outright
// before this dialog's confirmation reaches the server (ADR 0014, #86).
export function DeleteSourceDialog({
  open,
  title,
  noteCount,
  onClose,
  onConfirm,
}: DeleteSourceDialogProps) {
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
      header={{ title: 'Delete this Source?' }}
      footer={{
        secondary: { label: 'Cancel', onClick: onClose },
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
    </Dialog>
  );
}
