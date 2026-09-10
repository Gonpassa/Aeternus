import { useState } from 'react';
import type { AnchorWithAttachments } from '@nee3/shared-types';
import { Dialog } from '../../../../../../atoms/Dialog/Dialog.tsx';
import { Text } from '../../../../../../atoms/Text/Text.tsx';
import { countLabel } from '../../../../utils/countLabel.ts';

export interface RemoveNoteDialogProps {
  open: boolean;
  anchor: AnchorWithAttachments;
  excerpt: string;
  onClose: () => void;
  onConfirm: () => Promise<void>;
}

// Removing a note deletes its Anchor, and the Anchor cascades to everything hanging off it.
// That is more than the note shows at a glance - Associations are nested a level down - so
// the confirmation tallies each kind rather than asking "are you sure?".
export function RemoveNoteDialog({
  open,
  anchor,
  excerpt,
  onClose,
  onConfirm,
}: RemoveNoteDialogProps) {
  const [removing, setRemoving] = useState(false);

  const beatCount = anchor.emotionalBeats.length;
  const symbolCount = anchor.symbolAttachments.length;
  const associationCount = anchor.symbolAttachments.reduce(
    (total, attachment) => total + attachment.associations.length,
    0,
  );

  const handleConfirm = async () => {
    setRemoving(true);
    try {
      await onConfirm();
      onClose();
    } catch {
      // The global toast interceptor in api/client.ts already surfaced the failure; leave
      // the dialog open so the user can retry (see EmotionalBeatDialog for the pattern).
    } finally {
      setRemoving(false);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      variant="small"
      role="alertdialog"
      header={{ title: 'Remove this note?' }}
      footer={{
        secondary: { label: 'Cancel', onClick: onClose },
        primary: {
          label: 'Remove note',
          variant: 'destructive',
          onClick: handleConfirm,
          loading: removing,
        },
      }}
    >
      <Text textStyle="body">
        “{excerpt}” loses its underline in the manuscript, along with{' '}
        {countLabel(beatCount, 'emotional beat', 'emotional beats')},{' '}
        {countLabel(symbolCount, 'symbol tag', 'symbol tags')} and{' '}
        {countLabel(associationCount, 'association', 'associations')}. The dream&apos;s text itself
        is untouched. Analysis passes written about this passage are kept, but become passes about
        the dream as a whole.
      </Text>
    </Dialog>
  );
}
