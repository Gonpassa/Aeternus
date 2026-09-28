// PROTOTYPE - the Link affordance on a Literature note, which #67 asked the reading page to
// carry: cross-Source connections happen while reading, not only in Review. Pick the other
// note from the browsable panel, then write the reason, which is the smallest unit of the
// user's own thought. A Permanent note is what gets written when that reason outgrows a line.
import { useState } from 'react';
import { Stack } from '../../../atoms/Stack/Stack.tsx';
import { Text } from '../../../atoms/Text/Text.tsx';
import { Button } from '../../../atoms/Button/Button.tsx';
import { Input } from '../../../atoms/Input/Input.tsx';
import { RuledNote } from '../../../atoms/RuledNote/RuledNote.tsx';
import { LinkPanel } from './LinkPanel.tsx';
import type { NotesState } from '../captureNotesData.ts';
import { connectedIds, identify } from '../captureNotesData.ts';

export function LinkFlow({
  state,
  noteId,
  onLink,
  onDone,
  onOutgrown,
}: {
  state: NotesState;
  noteId: string;
  onLink: (targetId: string, reason: string) => void;
  onDone: () => void;
  // The escape hatch: the reason turned out to be a whole idea, so write it as a
  // Permanent note instead, pre-linked to both notes.
  onOutgrown?: (targetId: string) => void;
}) {
  const [target, setTarget] = useState<string | null>(null);
  const [reason, setReason] = useState('');
  const exclude = new Set([noteId, ...connectedIds(state, noteId)]);

  if (!target) {
    return (
      <Stack direction="column" gap="4">
        <Stack justify="space-between" align="baseline">
          <Text textStyle="label" color="rust">
            Link this to
          </Text>
          <Button variant="link" size="xs" onClick={onDone}>
            Close
          </Button>
        </Stack>
        <LinkPanel state={state} noteId={noteId} exclude={exclude} onPick={setTarget} />
      </Stack>
    );
  }

  const other = identify(state, target);
  return (
    <Stack direction="column" gap="3">
      <Text textStyle="label" color="rust">
        Why do these belong together?
      </Text>
      <RuledNote rule={reason.trim() ? 'moss' : 'rust'}>
        <Text textStyle="label" color="inkSoft">
          {other.kind === 'permanent' ? 'Permanent note' : other.headline}
        </Text>
        <Text textStyle="body" color="ink">
          {other.kind === 'permanent' ? other.headline : other.detail}
        </Text>
      </RuledNote>
      <Input
        placeholder="One line. This is the thought."
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        autoFocus
      />
      <Stack gap="3" wrap="wrap">
        <Button
          size="sm"
          disabled={!reason.trim()}
          onClick={() => {
            onLink(target, reason.trim());
            setTarget(null);
            setReason('');
            onDone();
          }}
        >
          Link them
        </Button>
        {onOutgrown && (
          <Button variant="ghost" size="sm" onClick={() => onOutgrown(target)}>
            This is bigger than a line
          </Button>
        )}
        <Button variant="link" size="sm" onClick={() => setTarget(null)}>
          Pick another
        </Button>
      </Stack>
    </Stack>
  );
}
