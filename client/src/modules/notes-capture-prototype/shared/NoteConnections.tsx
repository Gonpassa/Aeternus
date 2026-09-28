// PROTOTYPE - what has come of a Literature note, shown on the reading page: each Link with
// its reason, and any Permanent note written from it. Not a design question (#69 settled the
// connections view); it is here so the effect of the two affordances under test is visible.
import { Stack } from '../../../atoms/Stack/Stack.tsx';
import { Text } from '../../../atoms/Text/Text.tsx';
import { RuledNote } from '../../../atoms/RuledNote/RuledNote.tsx';
import type { NotesState } from '../captureNotesData.ts';
import { connectionsOf } from '../captureNotesData.ts';

export function NoteConnections({ state, noteId }: { state: NotesState; noteId: string }) {
  const connections = connectionsOf(state, noteId);
  if (connections.length === 0) return null;

  return (
    <Stack direction="column" gap="2" pt="1">
      {connections.map(({ link, other }) => (
        <RuledNote key={link.id} rule={other.kind === 'permanent' ? 'moss' : 'inkBlue'}>
          <Text textStyle="label" color={other.kind === 'permanent' ? 'moss' : 'inkSoft'}>
            {other.kind === 'permanent' ? 'Permanent note' : other.headline}
          </Text>
          <Text textStyle="body" color="ink">
            {other.kind === 'permanent' ? other.headline : other.detail}
          </Text>
          <Text textStyle="body" color="inkSoft" fontStyle="italic">
            {link.reason}
          </Text>
        </RuledNote>
      ))}
    </Stack>
  );
}
