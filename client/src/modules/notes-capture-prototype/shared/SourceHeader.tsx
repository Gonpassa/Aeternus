// PROTOTYPE - the reading page's Source header, settled in #70: title, kind, author, Topics,
// note count. Identical in every variant, so the variants disagree only about capture.
// The open-question line (#67) rides along here because it belongs to the Source, not the
// capture form: a Literature note flagged as an open question stays listed until cleared.
import { Stack } from '../../../atoms/Stack/Stack.tsx';
import { Text } from '../../../atoms/Text/Text.tsx';
import { Heading } from '../../../atoms/Heading/Heading.tsx';
import { Button } from '../../../atoms/Button/Button.tsx';
import { RuledNote } from '../../../atoms/RuledNote/RuledNote.tsx';
import { TopicTag } from './TopicTag.tsx';
import type { NotesState, Source } from '../captureNotesData.ts';
import {
  KIND_LABEL,
  notesForSource,
  openQuestionsFor,
  openingWords,
  renderLocator,
} from '../captureNotesData.ts';

export function SourceHeader({
  state,
  source,
  onClearOpenQuestion,
}: {
  state: NotesState;
  source: Source;
  onClearOpenQuestion: (noteId: string) => void;
}) {
  const count = notesForSource(state, source.id).length;
  const open = openQuestionsFor(state, source.id);

  return (
    <Stack direction="column" gap="3">
      <Stack direction="column" gap="1">
        <Text variant="eyebrow" color="rust">
          {KIND_LABEL[source.kind]}
        </Text>
        <Heading as="h1" variant="page">
          {source.title}
        </Heading>
      </Stack>
      <Stack gap="3" align="center" wrap="wrap">
        <Text textStyle="body" color="inkSoft">
          {source.author ?? 'No author'}
        </Text>
        <Text textStyle="label" color="inkSoft">
          {count} {count === 1 ? 'note' : 'notes'}
        </Text>
        {source.topics.map((t) => (
          <TopicTag key={t} topic={t} />
        ))}
      </Stack>
      {open.length > 0 && (
        <Stack direction="column" gap="2" pt="1">
          <Text textStyle="label" color="rust">
            Still open
          </Text>
          {open.map((note) => (
            <RuledNote key={note.id} rule="rust">
              <Stack gap="3" align="baseline" justify="space-between" wrap="wrap">
                <Stack direction="column" gap="0">
                  <Text textStyle="label" color="inkSoft">
                    {renderLocator(note)}
                  </Text>
                  <Text textStyle="body" color="ink">
                    {openingWords(note.body, 14)}
                  </Text>
                </Stack>
                <Button variant="link" size="xs" onClick={() => onClearOpenQuestion(note.id)}>
                  Settled
                </Button>
              </Stack>
            </RuledNote>
          ))}
        </Stack>
      )}
    </Stack>
  );
}
