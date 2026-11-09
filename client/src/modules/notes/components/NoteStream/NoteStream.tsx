import type {
  CreatePermanentNoteRequest,
  LiteratureNoteWithConnections,
  Topic,
  UpdateLiteratureNoteRequest,
} from '@nee3/shared-types';
import { Stack } from '../../../../atoms/Stack/Stack.tsx';
import { Text } from '../../../../atoms/Text/Text.tsx';
import { FiledNote } from './FiledNote/FiledNote.tsx';

export interface NoteStreamProps {
  notes: LiteratureNoteWithConnections[];
  sourceTitle: string;
  // The Source's Topics, which every card in the stream inherits: a Literature note carries
  // none of its own, because tagging at capture time is the collecting the method warns against
  // (CONTEXT.md, Topic).
  sourceTopics: Topic[];
  onCorrect: (noteId: number, input: UpdateLiteratureNoteRequest) => Promise<void>;
  onDelete: (noteId: number) => Promise<void>;
  onWritePermanentNote: (input: CreatePermanentNoteRequest) => Promise<void>;
}

// The stack of cards this Source has produced, in creation order, oldest first: the
// append-only reading stream, with no reordering and no sorting by Locator (#68). A reader
// who skips about in a book sees the order they wrote in, which is the order they read in.
export function NoteStream({
  notes,
  sourceTitle,
  sourceTopics,
  onCorrect,
  onDelete,
  onWritePermanentNote,
}: NoteStreamProps) {
  if (notes.length === 0) {
    return <Text variant="muted">Nothing written from this yet.</Text>;
  }

  return (
    <Stack direction="column" gap="6">
      {notes.map((note) => (
        <FiledNote
          key={note.id}
          note={note}
          sourceTitle={sourceTitle}
          inheritedTopics={sourceTopics}
          onCorrect={(input) => onCorrect(note.id, input)}
          onDelete={() => onDelete(note.id)}
          onWritePermanentNote={onWritePermanentNote}
        />
      ))}
    </Stack>
  );
}
