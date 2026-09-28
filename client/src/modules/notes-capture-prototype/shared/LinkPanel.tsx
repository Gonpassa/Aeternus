// PROTOTYPE - the browsable link panel settled in #67: notes from the same Source, then notes
// sharing a Topic, then full-text search with previews. Browsable rather than a search
// dropdown, because the user will not remember the wording of an older note. Identical in
// every variant; where a variant mounts it is the part under test.
import { useState } from 'react';
import { Stack } from '../../../atoms/Stack/Stack.tsx';
import { Text } from '../../../atoms/Text/Text.tsx';
import { Button } from '../../../atoms/Button/Button.tsx';
import { Input } from '../../../atoms/Input/Input.tsx';
import type { NoteIdentity, NotesState } from '../captureNotesData.ts';
import {
  sameSourceCandidates,
  sameTopicCandidates,
  searchCandidates,
} from '../captureNotesData.ts';

function CandidateRow({
  candidate,
  onPick,
}: {
  candidate: NoteIdentity;
  onPick: (id: string) => void;
}) {
  return (
    <Button
      variant="ghost"
      h="auto"
      textTransform="none"
      letterSpacing="normal"
      px="2"
      py="2"
      justifyContent="flex-start"
      whiteSpace="normal"
      textAlign="left"
      borderBottomWidth="1px"
      borderColor="line"
      borderRadius="0"
      _hover={{ bg: 'paperCard', textDecoration: 'none' }}
      onClick={() => onPick(candidate.id)}
    >
      <Stack direction="column" gap="0.5" align="flex-start" w="full">
        <Text textStyle="label" color={candidate.kind === 'permanent' ? 'moss' : 'inkSoft'}>
          {candidate.kind === 'permanent' ? 'Permanent note' : candidate.headline}
        </Text>
        <Text textStyle="body" color="ink">
          {candidate.kind === 'permanent' ? candidate.headline : candidate.detail}
        </Text>
      </Stack>
    </Button>
  );
}

function Group({
  title,
  candidates,
  onPick,
  empty,
}: {
  title: string;
  candidates: NoteIdentity[];
  onPick: (id: string) => void;
  empty: string;
}) {
  return (
    <Stack direction="column" gap="1">
      <Text textStyle="label" color="inkSoft">
        {title}
      </Text>
      {candidates.length === 0 ? (
        <Text textStyle="body" color="inkSoft" fontStyle="italic" py="1">
          {empty}
        </Text>
      ) : (
        <Stack direction="column" gap="0" borderTopWidth="1px" borderColor="line">
          {candidates.map((c) => (
            <CandidateRow key={c.id} candidate={c} onPick={onPick} />
          ))}
        </Stack>
      )}
    </Stack>
  );
}

export function LinkPanel({
  state,
  noteId,
  exclude,
  onPick,
  limit = 4,
}: {
  state: NotesState;
  noteId: string;
  exclude: Set<string>;
  onPick: (id: string) => void;
  limit?: number;
}) {
  const [query, setQuery] = useState('');
  const [showAllSource, setShowAllSource] = useState(false);
  const keep = (list: NoteIdentity[]) => list.filter((c) => !exclude.has(c.id));

  const fromSource = keep(sameSourceCandidates(state, noteId));
  const fromTopic = keep(sameTopicCandidates(state, noteId));
  const found = keep(searchCandidates(state, query, noteId));

  return (
    <Stack direction="column" gap="4">
      <Group
        title="From this Source"
        candidates={showAllSource ? fromSource : fromSource.slice(0, limit)}
        onPick={onPick}
        empty="Nothing else written from this Source yet."
      />
      {fromSource.length > limit && !showAllSource && (
        <Button
          variant="link"
          size="xs"
          alignSelf="flex-start"
          onClick={() => setShowAllSource(true)}
        >
          All {fromSource.length} from this Source
        </Button>
      )}
      <Group
        title="Sharing a Topic"
        candidates={fromTopic.slice(0, limit)}
        onPick={onPick}
        empty="Nothing else carries these Topics."
      />
      <Stack direction="column" gap="2">
        <Text textStyle="label" color="inkSoft">
          Everything else
        </Text>
        <Input
          size="sm"
          placeholder="Search every note…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        {query.trim().length > 0 && found.length === 0 && (
          <Text textStyle="body" color="inkSoft" fontStyle="italic">
            Nothing matches.
          </Text>
        )}
        {found.length > 0 && (
          <Stack direction="column" gap="0" borderTopWidth="1px" borderColor="line">
            {found.map((c) => (
              <CandidateRow key={c.id} candidate={c} onPick={onPick} />
            ))}
          </Stack>
        )}
      </Stack>
    </Stack>
  );
}
