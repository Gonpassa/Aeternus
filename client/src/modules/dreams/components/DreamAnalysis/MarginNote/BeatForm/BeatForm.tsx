import { useState } from 'react';
import { Button } from '../../../../../../atoms/Button/Button.tsx';
import { Input } from '../../../../../../atoms/Input/Input.tsx';
import { Stack } from '../../../../../../atoms/Stack/Stack.tsx';

export interface BeatFormProps {
  onSubmit: (label: string) => void | Promise<void>;
  onCancel: () => void;
}

// Inline margin-note composer for a new Emotional beat on an existing Anchor.
export function BeatForm({ onSubmit, onCancel }: BeatFormProps) {
  const [label, setLabel] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    const trimmed = label.trim();
    if (!trimmed) return;
    setSubmitting(true);
    try {
      await onSubmit(trimmed);
    } catch {
      // The global toast interceptor in api/client.ts already surfaced the failure;
      // leaving the form mounted (submitting reset below) lets the user retry.
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Stack direction="column" gap="1" mt="1">
      <Input
        size="sm"
        value={label}
        aria-label="Emotional beat"
        placeholder="How did this feel?"
        // eslint-disable-next-line jsx-a11y/no-autofocus -- the form appears in direct
        // response to the user asking to add an emotional beat.
        autoFocus
        onChange={(event) => setLabel(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === 'Enter') handleSubmit();
          if (event.key === 'Escape') onCancel();
        }}
      />
      <Stack direction="row" gap="1">
        <Button type="button" size="xs" onClick={handleSubmit} loading={submitting}>
          Add beat
        </Button>
        <Button type="button" size="xs" variant="ghost" onClick={onCancel}>
          Cancel
        </Button>
      </Stack>
    </Stack>
  );
}
