import { useState } from 'react';
import type { SourceWithTopics, UpdateSourceRequest } from '@nee3/shared-types';
import { Button } from '../../../../../atoms/Button/Button.tsx';
import { Heading } from '../../../../../atoms/Heading/Heading.tsx';
import { Stack } from '../../../../../atoms/Stack/Stack.tsx';
import { Text } from '../../../../../atoms/Text/Text.tsx';
import { countLabel } from '../../../../../utils/countLabel.ts';
import { SOURCE_KIND_LABEL } from '../../../sourceKinds.ts';
import { SourceForm } from '../../SourceForm/SourceForm.tsx';
import { TopicTags } from '../../TopicTags/TopicTags.tsx';
import { DeleteSourceDialog } from './DeleteSourceDialog/DeleteSourceDialog.tsx';

export interface SourceHeaderProps {
  source: SourceWithTopics;
  noteCount: number;
  onCorrect: (input: UpdateSourceRequest) => Promise<void>;
  onDelete: () => Promise<void>;
}

// What the Source is, and the two things that can be done to the record itself: correct it or
// throw it away. Nothing here reports a reading status - a Source has no lifecycle, and the
// note count is the only thing it says about itself (CONTEXT.md, Source).
export function SourceHeader({ source, noteCount, onCorrect, onDelete }: SourceHeaderProps) {
  const [correcting, setCorrecting] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  // In place, where the header stands, rather than on a page of its own: a mistyped title is
  // noticed while reading, and being sent elsewhere to fix it loses the reader's place (#83).
  if (correcting) {
    return (
      <SourceForm
        source={source}
        submitLabel="Save"
        onDiscard={() => setCorrecting(false)}
        onSubmit={async (input) => {
          await onCorrect(input);
          setCorrecting(false);
        }}
      />
    );
  }

  return (
    <Stack direction="column" gap="1">
      <Stack align="flex-start" justify="space-between" gap="4">
        <Stack direction="column" gap="1" minW="0">
          <Text variant="eyebrow" color="rust">
            {SOURCE_KIND_LABEL[source.kind]}
          </Text>
          <Heading as="h1" variant="page">
            {source.title}
          </Heading>
        </Stack>
        <Stack gap="2" flexShrink="0">
          <Button
            type="button"
            size="xs"
            variant="ghost"
            // Named in full for a screen reader: the page below has an "Edit" on every note.
            aria-label="Edit this Source"
            onClick={() => setCorrecting(true)}
          >
            Edit
          </Button>
          <Button type="button" size="xs" variant="ghost" onClick={() => setConfirmingDelete(true)}>
            Delete this Source
          </Button>
        </Stack>
      </Stack>
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
      {/* The Topics this Source carries, which its Literature notes inherit. Correcting them is
          the same in-place form as correcting the title, because a Topic is one of the Source's
          own fields rather than something attached to it afterwards (#87). */}
      <Stack pt="2">
        <TopicTags topics={source.topics} label={`Topics on ${source.title}`} />
      </Stack>
      {/* The count is only worth saying once there is something to count: the empty stream
          below already says that nothing has been written from this Source yet. */}
      {noteCount > 0 && (
        <Text textStyle="label" color="inkSoft" mt="2">
          {countLabel(noteCount, 'note', 'notes')}
        </Text>
      )}
      <DeleteSourceDialog
        open={confirmingDelete}
        title={source.title}
        noteCount={noteCount}
        onClose={() => setConfirmingDelete(false)}
        onConfirm={onDelete}
      />
    </Stack>
  );
}
