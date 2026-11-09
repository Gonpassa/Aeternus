import type {
  CreateLiteratureNoteRequest,
  CreatePermanentNoteRequest,
  LiteratureNoteWithConnections,
  SourceWithTopics,
  UpdateLiteratureNoteRequest,
  UpdateSourceRequest,
} from '@nee3/shared-types';
import { Stack } from '../../../../atoms/Stack/Stack.tsx';
import { NoteCapture } from '../NoteCapture/NoteCapture.tsx';
import { NoteStream } from '../NoteStream/NoteStream.tsx';
import { SourceHeader } from './SourceHeader/SourceHeader.tsx';

export interface SourceReadingProps {
  source: SourceWithTopics;
  notes: LiteratureNoteWithConnections[];
  sections: string[];
  onFile: (input: CreateLiteratureNoteRequest) => Promise<void>;
  onCorrectSource: (input: UpdateSourceRequest) => Promise<void>;
  onDeleteSource: () => Promise<void>;
  onCorrectNote: (noteId: number, input: UpdateLiteratureNoteRequest) => Promise<void>;
  onDeleteNote: (noteId: number) => Promise<void>;
  onWritePermanentNote: (input: CreatePermanentNoteRequest) => Promise<void>;
}

// The reading page: what the Source is, a blank card to write on, and the stack of cards
// already written from it, each with what has been built from it. Everything on it is
// correctable after the fact - the header in place, each filed card on the card itself (#83).
// The Source's Topics are shown on the header and inherited by every card below it (#87).
export function SourceReading({
  source,
  notes,
  sections,
  onFile,
  onCorrectSource,
  onDeleteSource,
  onCorrectNote,
  onDeleteNote,
  onWritePermanentNote,
}: SourceReadingProps) {
  return (
    <Stack direction="column" gap="8">
      <SourceHeader
        source={source}
        noteCount={notes.length}
        onCorrect={onCorrectSource}
        onDelete={onDeleteSource}
      />

      {/* Capture on one side, the stream on the other, as #73 settled - stacked on a narrow
          screen, where a column each would leave neither wide enough to write in. */}
      <Stack direction={{ base: 'column', lg: 'row' }} gap="10" align="flex-start">
        <Stack direction="column" flex="1" w="full" minW="0">
          <NoteCapture sections={sections} onFile={onFile} />
        </Stack>
        <Stack direction="column" flex="1" w="full" minW="0">
          <NoteStream
            notes={notes}
            sourceTitle={source.title}
            sourceTopics={source.topics}
            onCorrect={onCorrectNote}
            onDelete={onDeleteNote}
            onWritePermanentNote={onWritePermanentNote}
          />
        </Stack>
      </Stack>
    </Stack>
  );
}
