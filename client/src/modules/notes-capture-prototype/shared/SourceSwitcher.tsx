// PROTOTYPE scaffolding, not a proposal. Opening a Source is settled (#67: a card in the Read
// catalog), and there is no catalog here. This row stands in for it so capture can be judged
// against a Source mid-read, a Source with one note, and a Source with none at all.
import { Stack } from '../../../atoms/Stack/Stack.tsx';
import { Text } from '../../../atoms/Text/Text.tsx';
import { Button } from '../../../atoms/Button/Button.tsx';
import type { NotesState } from '../captureNotesData.ts';
import { notesForSource } from '../captureNotesData.ts';

export function SourceSwitcher({
  state,
  sourceId,
  onOpen,
}: {
  state: NotesState;
  sourceId: string;
  onOpen: (id: string) => void;
}) {
  return (
    <Stack gap="2" align="center" wrap="wrap" borderBottomWidth="1px" borderColor="line" pb="3">
      <Text textStyle="label" color="inkSoft" mr="1">
        Open
      </Text>
      {state.sources.map((s) => (
        <Button
          key={s.id}
          size="xs"
          variant={s.id === sourceId ? 'default' : 'outline'}
          onClick={() => onOpen(s.id)}
        >
          {s.title} · {notesForSource(state, s.id).length}
        </Button>
      ))}
    </Stack>
  );
}
