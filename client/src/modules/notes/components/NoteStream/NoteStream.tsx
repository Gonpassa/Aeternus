import type { LiteratureNote, UpdateLiteratureNoteRequest } from '@nee3/shared-types';
import { Stack } from '../../../../atoms/Stack/Stack.tsx';
import { Text } from '../../../../atoms/Text/Text.tsx';
import { FiledNote } from './FiledNote/FiledNote.tsx';

export interface NoteStreamProps {
  notes: LiteratureNote[];
  onCorrect: (noteId: number, input: UpdateLiteratureNoteRequest) => Promise<void>;
  onDelete: (noteId: number) => Promise<void>;
}

// The stack of cards this Source has produced, in creation order, oldest first: the
// append-only reading stream, with no reordering and no sorting by Locator (#68). A reader
// who skips about in a book sees the order they wrote in, which is the order they read in.
export function NoteStream({ notes, onCorrect, onDelete }: NoteStreamProps) {
  if (notes.length === 0) {
    return <Text variant="muted">Nothing written from this yet.</Text>;
  }

  return (
    <Stack direction="column" gap="6">
      {notes.map((note) => (
        <FiledNote
          key={note.id}
          note={note}
          onCorrect={(input) => onCorrect(note.id, input)}
          onDelete={() => onDelete(note.id)}
        />
      ))}
    </Stack>
  );
}
