import { useState } from 'react';
import type { AssociationKind } from '@nee3/shared-types';
import { Button } from '../../../../atoms/Button/Button.tsx';
import { Input } from '../../../../atoms/Input/Input.tsx';
import { Stack } from '../../../../atoms/Stack/Stack.tsx';
import {
  ToggleButtonGroup,
  ToggleButtonGroupItem,
} from '../../../../atoms/ToggleButtonGroup/ToggleButtonGroup.tsx';

export interface AssociationFormProps {
  initialContent?: string;
  initialKind?: AssociationKind;
  submitLabel: string;
  onSubmit: (content: string, kind: AssociationKind) => void | Promise<void>;
  onCancel: () => void;
}

// Inline composer shared by the add and edit flows for a Symbol's Associations - a
// freeform line of content plus its personal/cultural kind.
export function AssociationForm({
  initialContent = '',
  initialKind = 'personal',
  submitLabel,
  onSubmit,
  onCancel,
}: AssociationFormProps) {
  const [content, setContent] = useState(initialContent);
  const [kind, setKind] = useState<AssociationKind>(initialKind);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    const trimmed = content.trim();
    if (!trimmed) return;
    setSubmitting(true);
    try {
      await onSubmit(trimmed, kind);
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
        value={content}
        aria-label="Association"
        placeholder={kind === 'cultural' ? 'Cultural association…' : 'Personal association…'}
        // eslint-disable-next-line jsx-a11y/no-autofocus -- the form appears in direct
        // response to the user asking to add or edit an association.
        autoFocus
        onChange={(event) => setContent(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === 'Enter') handleSubmit();
          if (event.key === 'Escape') onCancel();
        }}
      />
      <ToggleButtonGroup
        value={kind}
        onChange={(value) => setKind(value as AssociationKind)}
        aria-label="Association kind"
      >
        <ToggleButtonGroupItem value="personal">Personal</ToggleButtonGroupItem>
        <ToggleButtonGroupItem value="cultural">Cultural</ToggleButtonGroupItem>
      </ToggleButtonGroup>
      <Stack direction="row" gap="1">
        <Button type="button" size="xs" onClick={handleSubmit} loading={submitting}>
          {submitLabel}
        </Button>
        <Button type="button" size="xs" variant="ghost" onClick={onCancel}>
          Cancel
        </Button>
      </Stack>
    </Stack>
  );
}
