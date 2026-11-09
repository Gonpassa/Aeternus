import { useState } from 'react';
import { Dialog } from '../../../../../../atoms/Dialog/Dialog.tsx';
import { Text } from '../../../../../../atoms/Text/Text.tsx';
import { serverMessage } from '../../../../utils/serverMessage.ts';

export interface RemoveLinkDialogProps {
  open: boolean;
  // How the note at the other end is named, so the user is deciding about a connection they
  // can see rather than about "this link".
  otherLabel: string;
  onClose: () => void;
  onConfirm: () => Promise<void>;
}

// Removing a connection takes the reasons written on it with it, and those lines are the user's
// own thinking rather than filing (ADR 0015) - so there is one chance to think again. Both
// notes stay exactly as they are; it is the connection between them that goes.
//
// This is not where the mandatory-Link rule is enforced. A removal that would leave a
// Permanent note with no Links at all is refused by the server, and the refusal names that
// note (ADR 0014) - it is not a warning this dialog could carry, because it is not the user's
// to confirm. The refusal is shown here, where the removal was asked for, and the dialog stays
// open so the note it names is still in view.
export function RemoveLinkDialog({ open, otherLabel, onClose, onConfirm }: RemoveLinkDialogProps) {
  const [removing, setRemoving] = useState(false);
  const [refusal, setRefusal] = useState<string | null>(null);

  const handleConfirm = async () => {
    setRemoving(true);
    setRefusal(null);
    try {
      await onConfirm();
      onClose();
    } catch (error) {
      setRefusal(serverMessage(error, 'That connection could not be removed just now.'));
    } finally {
      setRemoving(false);
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
      header={{ title: 'Remove this connection?' }}
      footer={{
        secondary: { label: 'Cancel', onClick: close },
        primary: {
          label: 'Remove connection',
          variant: 'destructive',
          onClick: handleConfirm,
          loading: removing,
        },
      }}
    >
      <Text textStyle="body">
        The line saying why this note and “{otherLabel}” belong together goes with it. Both notes
        stay as they are.
      </Text>
      {refusal !== null && (
        <Text variant="formError" role="alert" mt="3">
          {refusal}
        </Text>
      )}
    </Dialog>
  );
}
