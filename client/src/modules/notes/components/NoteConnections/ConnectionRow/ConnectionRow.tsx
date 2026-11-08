import { useState } from 'react';
import type { NoteConnection } from '@nee3/shared-types';
import { Button } from '../../../../../atoms/Button/Button.tsx';
import { Stack } from '../../../../../atoms/Stack/Stack.tsx';
import { Text } from '../../../../../atoms/Text/Text.tsx';
import { useNoteConnections } from '../../../api/noteHooks.ts';
import { noteKindLabel, noteLabel } from '../../../utils/noteLabel.ts';
import { NoteConnections } from '../NoteConnections.tsx';

export interface ConnectionRowProps {
  connection: NoteConnection;
  // The note this row is being read from, so the row can attribute each reason to the end that
  // wrote it: `reason` belongs to the Link's origin, `targetReason` to its target (ADR 0013).
  fromNoteId: number;
  // A row reached from another row stops offering to go further. One level of reaching through
  // is reading the note at the other end; two is a browsing surface, which is #85 and #88.
  nested?: boolean;
}

// One connection: the note at the other end, and underneath it the line saying why the two
// belong together. The reason is the row's substance rather than its caption - it is the
// smallest unit of the user's thinking in this module (ADR 0015) - so it sits directly under
// the name it explains, in the user's own words.
export function ConnectionRow({ connection, fromNoteId, nested = false }: ConnectionRowProps) {
  const [opened, setOpened] = useState(false);
  const { heading, detail } = noteLabel(connection);
  const { link, other } = connection;
  const connections = useNoteConnections(other.id, opened);

  // Which end wrote which line, said from where this row is being read. The origin's reason is
  // always present; the other end's is there only once that end has linked back.
  const ownReason = link.originNoteId === fromNoteId ? link.reason : link.targetReason;
  const otherReason = link.originNoteId === fromNoteId ? link.targetReason : link.reason;

  return (
    <Stack
      as="li"
      direction="column"
      gap="1"
      borderLeftWidth="2px"
      borderLeftColor="borderSoft"
      pl="3"
      py="1"
    >
      <Text variant="eyebrow" color="inkSoft">
        {noteKindLabel(other)}
      </Text>
      <Text textStyle="bodyStrong" color="ink">
        {heading}
      </Text>
      {detail !== null && (
        <Text textStyle="body" color="inkSoft">
          {detail}
        </Text>
      )}
      {otherReason !== null && (
        <Text textStyle="body" color="ink">
          {otherReason}
        </Text>
      )}
      {ownReason !== null && (
        <Text textStyle="body" color="inkSoft">
          {ownReason}
        </Text>
      )}
      {!nested && (
        <Stack direction="column" gap="2" align="flex-start">
          <Button
            type="button"
            size="xs"
            variant="ghost"
            aria-expanded={opened}
            onClick={() => setOpened(!opened)}
          >
            {opened ? 'Hide its connections' : 'Its connections'}
          </Button>
          {opened && connections.data && (
            <NoteConnections connections={connections.data.connections} noteId={other.id} nested />
          )}
          {opened && connections.isError && (
            <Text variant="muted">Its connections could not be loaded.</Text>
          )}
        </Stack>
      )}
    </Stack>
  );
}
