import { useState } from 'react';
import { Button } from '../../../../atoms/Button/Button.tsx';
import { Input } from '../../../../atoms/Input/Input.tsx';
import { Stack } from '../../../../atoms/Stack/Stack.tsx';
import { Text } from '../../../../atoms/Text/Text.tsx';
import { linkReasonError } from '../../utils/linkReason.ts';
import { serverMessage } from '../../utils/serverMessage.ts';

export interface ReasonFieldProps {
  // The line as it stands. Empty when the reason is being written for the first time, and the
  // user's own sentence when it is being rewritten - a rewrite opens with what it rewrites.
  reason?: string;
  // Distinguishes this field's message from another field's on the same row.
  id: string;
  // What the button says, which is what the field is for: making a connection, adding this
  // end's line to one, or rewriting a line already written.
  submitLabel: string;
  onSubmit: (reason: string) => Promise<void>;
  onCancel: () => void;
}

// The one line saying why two notes belong together, taken from the user. Every path that
// writes a reason uses this: the browsable panel asks for it before a Link is made, and the
// connections view reopens it to rewrite one. They ask the same question under different
// buttons, and the rule it is held to is the same - a reason is required and one line long
// (ADR 0015) - so the question is asked in one place.
//
// It cannot be emptied. A Link with no reason from the end that wrote it is not a state this
// module allows, so clearing the field is refused rather than taken as removing the line;
// removing the Link itself is a separate move.
export function ReasonField({
  reason = '',
  id,
  submitLabel,
  onSubmit,
  onCancel,
}: ReasonFieldProps) {
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
      await onSubmit(draft.trim());
    } catch (failure) {
      // The line was already held to the rule the server applies, so a refusal here is about
      // the connection rather than about the words - an end that has already said why, a note
      // that has gone. Those are written to be read, so they are shown rather than swallowed.
      setError(serverMessage(failure, 'That could not be saved just now.'));
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
        placeholder="Why these belong together, in one line"
        // eslint-disable-next-line jsx-a11y/no-autofocus -- the field appears because the user
        // asked for it, and writing the line is the only thing to do once it has.
        autoFocus
      />
      {error !== null && (
        <Text id={id} variant="formError" role="alert">
          {error}
        </Text>
      )}
      <Stack align="center" gap="3">
        <Button type="button" size="xs" variant="ghost" onClick={onCancel}>
          Never mind
        </Button>
        <Button type="button" size="xs" loading={saving} onClick={submit}>
          {submitLabel}
        </Button>
      </Stack>
    </Stack>
  );
}
