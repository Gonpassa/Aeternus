import * as React from 'react';
import { Box, Dialog as ChakraDialog, Portal } from '@chakra-ui/react';
import { Button, type ButtonVariant } from '../Button/Button.tsx';

export type DialogVariant = 'small' | 'medium' | 'large';

const MAX_WIDTH_BY_VARIANT: Record<DialogVariant, string> = {
  small: 'sm',
  medium: 'md',
  large: 'lg',
};

export interface DialogFooterButtonConfig {
  label: string;
  onClick: () => void | Promise<void>;
  variant?: ButtonVariant;
  loading?: boolean;
  disabled?: boolean;
  fullWidth?: boolean;
}

export interface DialogFooterConfig {
  primary: DialogFooterButtonConfig;
  secondary?: DialogFooterButtonConfig;
}

export interface DialogProps {
  open: boolean;
  onClose: () => void;
  variant?: DialogVariant;
  /** Use 'alertdialog' for interruptive confirmations of a destructive action. */
  role?: 'dialog' | 'alertdialog';
  header: { title: string };
  footer?: DialogFooterConfig;
  children: React.ReactNode;
}

function DialogFooterButton({ config }: { config: DialogFooterButtonConfig }) {
  return (
    <Button
      type="button"
      variant={config.variant}
      loading={config.loading}
      disabled={config.disabled}
      flex={config.fullWidth ? 1 : undefined}
      onClick={config.onClick}
    >
      {config.label}
    </Button>
  );
}

export function Dialog({
  open,
  onClose,
  variant = 'medium',
  role = 'dialog',
  header,
  footer,
  children,
}: DialogProps) {
  return (
    <ChakraDialog.Root
      role={role}
      open={open}
      onOpenChange={(details) => !details.open && onClose()}
    >
      <Portal>
        <ChakraDialog.Backdrop bg="blackAlpha.600" />
        <ChakraDialog.Positioner>
          <ChakraDialog.Content
            bg="paperCard"
            borderWidth="1px"
            borderColor="line"
            borderRadius="md"
            boxShadow="lg"
            maxW={MAX_WIDTH_BY_VARIANT[variant]}
            p="6"
          >
            <ChakraDialog.Title
              fontFamily="heading"
              fontSize="xl"
              fontWeight="semibold"
              color="ink"
            >
              {header.title}
            </ChakraDialog.Title>
            <Box mt="2">{children}</Box>
            {footer && (
              <ChakraDialog.Footer mt="6" display="flex" justifyContent="flex-end" gap="3">
                {footer.secondary && <DialogFooterButton config={footer.secondary} />}
                <DialogFooterButton config={footer.primary} />
              </ChakraDialog.Footer>
            )}
          </ChakraDialog.Content>
        </ChakraDialog.Positioner>
      </Portal>
    </ChakraDialog.Root>
  );
}
