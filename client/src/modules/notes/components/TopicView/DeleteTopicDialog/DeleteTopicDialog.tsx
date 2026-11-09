import { useState } from 'react';
import type { TopicListEntry } from '@nee3/shared-types';
import { Dialog } from '../../../../../atoms/Dialog/Dialog.tsx';
import { Stack } from '../../../../../atoms/Stack/Stack.tsx';
import { Text } from '../../../../../atoms/Text/Text.tsx';
import { topicCarrierLabel } from '../../../utils/topicCarriers.ts';

export interface DeleteTopicDialogProps {
  open: boolean;
  topic: TopicListEntry;
  onClose: () => void;
  onConfirm: () => Promise<void>;
}

// Deleting a Topic takes a word out of the vocabulary and off every carrier that wore it, and
// deletes nothing else - so the confirmation names the carriers it is about to detach and says
// outright that no note goes with them (CONTEXT.md, Topic).
export function DeleteTopicDialog({ open, topic, onClose, onConfirm }: DeleteTopicDialogProps) {
  const [deleting, setDeleting] = useState(false);

  const handleConfirm = async () => {
    setDeleting(true);
    try {
      await onConfirm();
      onClose();
    } catch {
      // The global toast interceptor in api/client.ts already surfaced the failure; leave the
      // dialog open so the user can retry (see DeleteSourceDialog for the pattern).
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
      header={{ title: 'Delete this Topic?' }}
      footer={{
        secondary: { label: 'Cancel', onClick: onClose },
        primary: {
          label: 'Delete Topic',
          variant: 'destructive',
          onClick: handleConfirm,
          loading: deleting,
        },
      }}
    >
      <Stack direction="column" gap="3">
        <Text textStyle="body">
          “{topic.name}” leaves the vocabulary and comes off every carrier that wore it:{' '}
          {topicCarrierLabel(topic)}.
        </Text>
        <Text textStyle="label" color="inkSoft">
          No note and no Source is deleted - they keep every other Topic they wear.
        </Text>
      </Stack>
    </Dialog>
  );
}
