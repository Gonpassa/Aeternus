import { useState } from 'react';

export function useDialogState(initialOpen = false) {
  const [open, setOpen] = useState(initialOpen);
  return {
    open,
    openDialog: () => setOpen(true),
    closeDialog: () => setOpen(false),
  };
}
