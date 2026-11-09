import { useState } from 'react';
import type { TopicDetailResponse, TopicListEntry } from '@nee3/shared-types';
import { Button } from '../../../../atoms/Button/Button.tsx';
import { Heading } from '../../../../atoms/Heading/Heading.tsx';
import { Stack } from '../../../../atoms/Stack/Stack.tsx';
import { Text } from '../../../../atoms/Text/Text.tsx';
import { topicCarrierLabel } from '../../utils/topicCarriers.ts';
import { DeleteTopicDialog } from './DeleteTopicDialog/DeleteTopicDialog.tsx';
import { RenameTopicDialog } from './RenameTopicDialog/RenameTopicDialog.tsx';
import { TopicNoteCard } from './TopicNoteCard/TopicNoteCard.tsx';
import { TopicSourceRow } from './TopicSourceRow/TopicSourceRow.tsx';

export interface TopicViewProps {
  detail: TopicDetailResponse;
  // The whole vocabulary, which the rename needs: renaming into a name that already exists is
  // the merge, and the confirmation names the other Topic's carrier counts (#88).
  vocabulary: TopicListEntry[];
  onRename: (name: string) => Promise<void>;
  onDelete: () => Promise<void>;
}

// A Topic as a place: the Permanent notes carrying it, most-linked first, then the Sources
// carrying it. Individual Literature notes are deliberately absent - they inherit their
// Source's Topics and stay reachable through their Source (CONTEXT.md, Topic view). Renaming
// and deleting live here, where the carriers about to change are already on screen rather than
// behind a destructive control on every tag (#88).
export function TopicView({ detail, vocabulary, onRename, onDelete }: TopicViewProps) {
  const [renaming, setRenaming] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const { topic, permanentNotes, sources } = detail;
  const carriesNothing = permanentNotes.length === 0 && sources.length === 0;

  return (
    <Stack direction="column" gap="6">
      <Stack align="flex-start" justify="space-between" gap="4" wrap="wrap">
        <Stack direction="column" gap="1">
          <Text variant="eyebrow" color="rust">
            Topic
          </Text>
          <Heading as="h1" variant="page">
            {topic.name}
          </Heading>
          <Text textStyle="label" color="inkSoft">
            {topicCarrierLabel(topic)}
          </Text>
        </Stack>
        {/* Vocabulary maintenance, at the top of the Topic it is about: both controls are
            quiet, because browsing is what this page is for. */}
        <Stack direction="row" gap="2">
          <Button type="button" variant="outline" size="sm" onClick={() => setRenaming(true)}>
            Rename
          </Button>
          <Button type="button" variant="ghost" size="sm" onClick={() => setDeleting(true)}>
            Delete
          </Button>
        </Stack>
      </Stack>

      {/* A Topic nobody carries any more is a word still in the vocabulary rather than an
          error, so the page says what it is instead of showing two empty headings. */}
      {carriesNothing && (
        <Text variant="muted">
          Nothing carries this Topic yet. Type it on a Source or on a Permanent note, or delete it
          to take the word out of the vocabulary.
        </Text>
      )}

      {permanentNotes.length > 0 && (
        <Stack direction="column" gap="3">
          <Heading as="h2" variant="section">
            Ideas
          </Heading>
          {/* Most-linked first: the note most connected to the box is the front door, and
              there is no pinned entry note above it (#88). */}
          <Stack
            as="ul"
            direction="column"
            gap="4"
            listStyleType="none"
            aria-label="Permanent notes carrying this Topic"
          >
            {permanentNotes.map((note) => (
              <TopicNoteCard key={note.id} note={note} />
            ))}
          </Stack>
        </Stack>
      )}

      {sources.length > 0 && (
        <Stack direction="column" gap="2">
          <Heading as="h2" variant="section">
            Sources
          </Heading>
          <Stack
            as="ul"
            direction="column"
            gap="0"
            listStyleType="none"
            aria-label="Sources carrying this Topic"
          >
            {sources.map((source) => (
              <TopicSourceRow key={source.id} source={source} />
            ))}
          </Stack>
        </Stack>
      )}

      <RenameTopicDialog
        open={renaming}
        topic={topic}
        vocabulary={vocabulary}
        onClose={() => setRenaming(false)}
        onConfirm={onRename}
      />
      <DeleteTopicDialog
        open={deleting}
        topic={topic}
        onClose={() => setDeleting(false)}
        onConfirm={onDelete}
      />
    </Stack>
  );
}
