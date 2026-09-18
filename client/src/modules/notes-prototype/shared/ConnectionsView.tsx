// PROTOTYPE - the connections view settled in #69: two groups by direction, each row naming
// the other note with the reason under it. Shared across variants because its contents are
// decided; only where it sits on the page is under test.
import { Stack } from '../../../atoms/Stack/Stack.tsx';
import { Text } from '../../../atoms/Text/Text.tsx';
import { Button } from '../../../atoms/Button/Button.tsx';
import { RuledNote } from '../../../atoms/RuledNote/RuledNote.tsx';
import type { Connection, NotesState } from '../prototypeNotesData.ts';
import { connectionsOf } from '../prototypeNotesData.ts';

function ConnectionRow({
  connection,
  onOpenNote,
}: {
  connection: Connection;
  onOpenNote: (id: string) => void;
}) {
  const { other, link } = connection;
  return (
    <RuledNote rule={other.kind === 'permanent' ? 'moss' : 'hairline'}>
      <Button
        variant="ghost"
        h="auto"
        textTransform="none"
        letterSpacing="normal"
        px="0"
        py="0"
        whiteSpace="normal"
        textAlign="left"
        justifyContent="flex-start"
        fontFamily="heading"
        fontWeight="medium"
        textStyle="cardTitle"
        color="ink"
        onClick={() => onOpenNote(other.id)}
      >
        {other.headline}
      </Button>
      {other.detail && (
        <Text textStyle="body" color="inkSoft" fontStyle="italic">
          {other.detail}
        </Text>
      )}
      <Text textStyle="body" color="ink" mt="1">
        {link.reason}
      </Text>
    </RuledNote>
  );
}

export function ConnectionsView({
  state,
  noteId,
  onOpenNote,
  onAddLink,
}: {
  state: NotesState;
  noteId: string;
  onOpenNote: (id: string) => void;
  onAddLink?: () => void;
}) {
  const { connectsTo, connectedFrom } = connectionsOf(state, noteId);
  return (
    <Stack direction="column" gap="6">
      <Stack direction="column" gap="3">
        <Stack justify="space-between" align="baseline">
          <Text textStyle="label" color="rust">
            Connects to
          </Text>
          {onAddLink && (
            <Button variant="link" size="xs" onClick={onAddLink}>
              + Add a Link
            </Button>
          )}
        </Stack>
        {connectsTo.length === 0 && (
          <Text textStyle="body" color="inkSoft">
            Nothing yet.
          </Text>
        )}
        {connectsTo.map((c) => (
          <ConnectionRow key={c.link.id} connection={c} onOpenNote={onOpenNote} />
        ))}
      </Stack>
      <Stack direction="column" gap="3">
        <Text textStyle="label" color="rust">
          Connected from
        </Text>
        {connectedFrom.length === 0 && (
          <Text textStyle="body" color="inkSoft">
            Nothing has been built from this yet.
          </Text>
        )}
        {connectedFrom.map((c) => (
          <ConnectionRow key={c.link.id} connection={c} onOpenNote={onOpenNote} />
        ))}
      </Stack>
    </Stack>
  );
}
