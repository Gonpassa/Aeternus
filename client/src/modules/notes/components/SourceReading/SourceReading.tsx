import type {
  CreateLiteratureNoteRequest,
  CreatePermanentNoteRequest,
  LiteratureNoteWithConnections,
  Source,
} from '@nee3/shared-types';
import { countLabel } from '../../../../utils/countLabel.ts';
import { Heading } from '../../../../atoms/Heading/Heading.tsx';
import { Stack } from '../../../../atoms/Stack/Stack.tsx';
import { Text } from '../../../../atoms/Text/Text.tsx';
import { SOURCE_KIND_LABEL } from '../../sourceKinds.ts';
import { NoteCapture } from '../NoteCapture/NoteCapture.tsx';
import { NoteStream } from '../NoteStream/NoteStream.tsx';

export interface SourceReadingProps {
  source: Source;
  notes: LiteratureNoteWithConnections[];
  sections: string[];
  onFile: (input: CreateLiteratureNoteRequest) => Promise<void>;
  onWritePermanentNote: (input: CreatePermanentNoteRequest) => Promise<void>;
}

// The reading page: what the Source is, a blank card to write on, and the stack of cards
// already written from it. Nothing here reports a reading status - a Source has no lifecycle,
// and the note count is the only thing it says about itself (CONTEXT.md, Source). Topics
// arrive with their own ticket.
export function SourceReading({
  source,
  notes,
  sections,
  onFile,
  onWritePermanentNote,
}: SourceReadingProps) {
  return (
    <Stack direction="column" gap="8">
      <Stack direction="column" gap="1">
        <Text variant="eyebrow" color="rust">
          {SOURCE_KIND_LABEL[source.kind]}
        </Text>
        <Heading as="h1" variant="page">
          {source.title}
        </Heading>
        {source.author && (
          <Text textStyle="body" color="inkSoft">
            {source.author}
          </Text>
        )}
        {/* Body type, not the label rung: that rung uppercases, and an uppercased URL reads as
            a different address from the one the user pasted. */}
        {source.url && (
          <Text textStyle="body" color="inkBlue" textDecoration="underline" asChild>
            {/* Opened away from the app, and `noreferrer` with it: where someone reads is
                theirs, and the destination has no business being told it came from here. */}
            <a href={source.url} target="_blank" rel="noreferrer">
              {source.url}
            </a>
          </Text>
        )}
        {/* The count is only worth saying once there is something to count: the empty stream
            below already says that nothing has been written from this Source yet. */}
        {notes.length > 0 && (
          <Text textStyle="label" color="inkSoft" mt="2">
            {countLabel(notes.length, 'note', 'notes')}
          </Text>
        )}
      </Stack>

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
            onWritePermanentNote={onWritePermanentNote}
          />
        </Stack>
      </Stack>
    </Stack>
  );
}
