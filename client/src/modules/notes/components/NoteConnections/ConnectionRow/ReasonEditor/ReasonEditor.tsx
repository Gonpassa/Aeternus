import { useState } from 'react';
import { Button } from '../../../../../../atoms/Button/Button.tsx';
import { Input } from '../../../../../../atoms/Input/Input.tsx';
import { Stack } from '../../../../../../atoms/Stack/Stack.tsx';
import { Text } from '../../../../../../atoms/Text/Text.tsx';
import { linkReasonError } from '../../../../utils/linkReason.ts';

export interface ReasonEditorProps {
  // The line as it stands, which is what the field opens with: this is a rewrite of the user's
  // own sentence, not a blank field.
  reason: string;
  // Distinguishes this field's error from the other end's on the same row.
  id: string;
  onSave: (reason: string) => Promise<void>;
  onCancel: () => void;
}

// A reason rewritten where it is read. Editing in place rather than in a form elsewhere is the
// same choice the rest of the module makes about corrections (#83), and it is only ever offered
// to the end that wrote the line: a Link carries two reasons and neither end speaks for the
// other (ADR 0013).
//
// It cannot be emptied. A Link with no reason from the end that made it is not a state this
// module allows, so clearing the field is refused rather than treated as removing the line
// (ADR 0015) - removing the Link itself is the row's other affordance.
export function ReasonEditor({ reason, id, onSave, onCancel }: ReasonEditorProps) {
  const [draft, setDraft] = useState(reason);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    const message = linkReasonError(draft);
    setError(message);
    if (message !== null) {
      return;
    }
    setSaving(true);
    try {
      await onSave(draft.trim());
    } catch {
      // Not field-attributable: the global toast interceptor in api/client.ts has already
      // surfaced the failure, and the field keeps what was typed.
    } finally {
      setSaving(false);
    }
  };

  return (
    <Stack direction="column" gap="2" align="flex-start" w="full">
      <Input
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
        aria-label="Why these belong together"
        aria-describedby={error ? id : undefined}
        // eslint-disable-next-line jsx-a11y/no-autofocus -- the field appears because the user
        // asked to rewrite this line, and it is the only thing to do once it has.
        autoFocus
      />
      {error !== null && (
        <Text id={id} variant="formError" role="alert">
          {error}
        </Text>
      )}
      <Stack align="center" gap="3">
        <Button type="button" size="xs" variant="ghost" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="button" size="xs" loading={saving} onClick={submit}>
          Save the reason
        </Button>
      </Stack>
    </Stack>
  );
}
