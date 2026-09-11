import { Dialog } from '../../../../../atoms/Dialog/Dialog.tsx';
import { SymbolAutocompleteInput } from '../SymbolAutocompleteInput/SymbolAutocompleteInput.tsx';

export interface SymbolTagDialogProps {
  open: boolean;
  vocabulary: string[];
  onClose: () => void;
  onSubmit: (name: string) => void | Promise<void>;
}

// The "tag symbol" toolbar action on a fresh selection - the Anchor does not exist yet,
// so there is no margin note to host an inline form; the dialog collects the symbol name
// and submitting it creates the Anchor and the tag together (see DreamAnalysis's
// pending-selection flow).
export function SymbolTagDialog({ open, vocabulary, onClose, onSubmit }: SymbolTagDialogProps) {
  if (!open) return null;
  return (
    <Dialog open={open} onClose={onClose} variant="small" header={{ title: 'Tag a symbol' }}>
      <SymbolAutocompleteInput vocabulary={vocabulary} onSubmit={onSubmit} onCancel={onClose} />
    </Dialog>
  );
}
