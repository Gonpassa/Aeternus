import { useEffect, useState } from 'react';
import { Dialog } from '../../../../atoms/Dialog/Dialog.tsx';
import { FieldLabel } from '../../../../atoms/FieldLabel/FieldLabel.tsx';
import { Input } from '../../../../atoms/Input/Input.tsx';

export interface EmotionalBeatDialogProps {
  open: boolean;
  title: string;
  initialLabel?: string;
  onClose: () => void;
  onSubmit: (label: string) => void | Promise<void>;
}

// Shared by both the create (selection popover -> "add emotional beat") and edit flows -
// an Emotional beat is just a freeform label, so both need the same single-field form.
export function EmotionalBeatDialog({
  open,
  title,
  initialLabel = '',
  onClose,
  onSubmit,
}: EmotionalBeatDialogProps) {
  const [label, setLabel] = useState(initialLabel);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open) setLabel(initialLabel);
  }, [open, initialLabel]);

  const handleSubmit = async () => {
    const trimmed = label.trim();
    if (!trimmed) return;
    setSubmitting(true);
    try {
      await onSubmit(trimmed);
    } catch {
      // Save failures aren't field-attributable here - the global toast interceptor in
      // api/client.ts already surfaced it (see EntryForm.tsx's onValid for the same
      // pattern). Leaving the dialog open (submitting reset below) lets the user retry.
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      variant="small"
      header={{ title }}
      footer={{
        secondary: { label: 'Cancel', onClick: onClose },
        primary: {
          label: 'Save',
          onClick: handleSubmit,
          loading: submitting,
          disabled: label.trim().length === 0,
        },
      }}
    >
      <FieldLabel htmlFor="emotional-beat-label">
        What emotion did this moment carry?
        <Input
          id="emotional-beat-label"
          value={label}
          onChange={(event) => setLabel(event.target.value)}
          placeholder="e.g. dread, awe, longing"
          autoFocus
        />
      </FieldLabel>
    </Dialog>
  );
}
