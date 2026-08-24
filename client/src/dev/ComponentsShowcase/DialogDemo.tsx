import { useState } from 'react';
import { Button } from '../../atoms/Button/Button.tsx';
import { Dialog } from '../../atoms/Dialog/Dialog.tsx';
import { useDialogState } from '../../atoms/Dialog/useDialogState.ts';
import { Stack } from '../../atoms/Stack/Stack.tsx';
import { Text } from '../../atoms/Text/Text.tsx';
import { Section } from './Section.tsx';

export function DialogDemo() {
  const [confirmCount, setConfirmCount] = useState(0);
  const confirmDialog = useDialogState();

  return (
    <Section title="Dialog" description="controlled dialog primitive; confirmations tally below">
      <Stack align="center" gap="3">
        <Button variant="outline" onClick={confirmDialog.openDialog}>
          Delete something
        </Button>
        <Dialog
          open={confirmDialog.open}
          onClose={confirmDialog.closeDialog}
          variant="small"
          role="alertdialog"
          header={{ title: 'Delete this thing?' }}
          footer={{
            secondary: { label: 'Cancel', onClick: confirmDialog.closeDialog },
            primary: {
              label: 'Delete',
              variant: 'destructive',
              onClick: () => {
                setConfirmCount((count) => count + 1);
                confirmDialog.closeDialog();
              },
            },
          }}
        >
          <Text fontFamily="body" color="inkSoft">
            This action cannot be undone.
          </Text>
        </Dialog>
        <Text fontFamily="mono" fontSize="xs" color="inkSoft">
          Confirmed {confirmCount} time{confirmCount === 1 ? '' : 's'}
        </Text>
      </Stack>
    </Section>
  );
}
