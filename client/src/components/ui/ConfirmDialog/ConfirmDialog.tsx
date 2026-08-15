import * as React from 'react';
import { Dialog as ChakraDialog, Portal } from '@chakra-ui/react';
import { Button } from '../Button/Button.tsx';

export interface ConfirmDialogProps {
  trigger: React.ReactElement;
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
  onConfirm: () => void | Promise<void>;
}

export function ConfirmDialog({
  trigger,
  title,
  description,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  destructive = false,
  onConfirm,
}: ConfirmDialogProps) {
  const [open, setOpen] = React.useState(false);

  const handleConfirm = async () => {
    await onConfirm();
    setOpen(false);
  };

  return (
    <ChakraDialog.Root
      role="alertdialog"
      open={open}
      onOpenChange={(details) => setOpen(details.open)}
    >
      <ChakraDialog.Trigger asChild>{trigger}</ChakraDialog.Trigger>
      <Portal>
        <ChakraDialog.Backdrop bg="blackAlpha.600" />
        <ChakraDialog.Positioner>
          <ChakraDialog.Content
            bg="paperCard"
            borderWidth="1px"
            borderColor="line"
            borderRadius="md"
            boxShadow="lg"
            maxW="sm"
            p="6"
          >
            <ChakraDialog.Title
              fontFamily="heading"
              fontSize="xl"
              fontWeight="semibold"
              color="ink"
            >
              {title}
            </ChakraDialog.Title>
            {description && (
              <ChakraDialog.Description mt="2" fontFamily="body" color="inkSoft">
                {description}
              </ChakraDialog.Description>
            )}
            <ChakraDialog.Footer mt="6" display="flex" justifyContent="flex-end" gap="3">
              <ChakraDialog.CloseTrigger asChild>
                <Button type="button" variant="ghost">
                  {cancelLabel}
                </Button>
              </ChakraDialog.CloseTrigger>
              <Button
                type="button"
                variant={destructive ? 'destructive' : 'default'}
                onClick={handleConfirm}
              >
                {confirmLabel}
              </Button>
            </ChakraDialog.Footer>
          </ChakraDialog.Content>
        </ChakraDialog.Positioner>
      </Portal>
    </ChakraDialog.Root>
  );
}
