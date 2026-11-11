import type { NoteConnections as Groups } from '@nee3/shared-types';
import { Stack } from '../../../../atoms/Stack/Stack.tsx';
import { Text } from '../../../../atoms/Text/Text.tsx';
import { ConnectionRow } from './ConnectionRow/ConnectionRow.tsx';

export interface NoteConnectionsProps {
  connections: Groups;
  // The note whose connections these are, so each row knows which end of its Link it is being
  // read from.
  noteId: number;
  nested?: boolean;
}

// Every note - either kind - is read with its connections, in two groups named for the Link's
// direction (ADR 0013). On a Literature note the inbound group is the payoff: what the user
// has built from that reading. A group with nothing in it is left out rather than shown empty,
// because the web of Links is the only structure here and an empty heading describes none.
export function NoteConnections({ connections, noteId, nested = false }: NoteConnectionsProps) {
  const groups = [
    { heading: 'Links to', rows: connections.connectsTo },
    { heading: 'Linked from', rows: connections.connectedFrom },
  ].filter((group) => group.rows.length > 0);

  if (groups.length === 0) {
    return null;
  }

  return (
    <Stack direction="column" gap="4" w="full">
      {groups.map((group) => (
        <Stack key={group.heading} direction="column" gap="2">
          <Text variant="eyebrow" color="moss">
            {group.heading}
          </Text>
          <Stack as="ul" direction="column" gap="3" listStyleType="none">
            {group.rows.map((connection) => (
              <ConnectionRow
                key={connection.link.id}
                connection={connection}
                fromNoteId={noteId}
                nested={nested}
              />
            ))}
          </Stack>
        </Stack>
      ))}
    </Stack>
  );
}
