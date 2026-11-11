import { useEffect, useState } from 'react';
import type { CreateLinkRequest, LinkTargetCandidate } from '@nee3/shared-types';
import { Button } from '../../../../atoms/Button/Button.tsx';
import { Input } from '../../../../atoms/Input/Input.tsx';
import { Spinner } from '../../../../atoms/Spinner/Spinner.tsx';
import { Stack } from '../../../../atoms/Stack/Stack.tsx';
import { Text } from '../../../../atoms/Text/Text.tsx';
import { useLinkTargets } from '../../api/linkHooks.ts';
import { useTopicRelatedNotes } from '../../api/topicHooks.ts';
import { LinkCandidate } from './LinkCandidate/LinkCandidate.tsx';
import { SEARCH_DEBOUNCE_MS, toTopicCandidates } from './LinkPanel.utils.ts';

export interface LinkPanelProps {
  // The note the Link is being made from. Also the end the reason is attributed to, and the
  // only thing the panel needs to know about where it was opened - which is what lets Review
  // open the same panel without a fork.
  fromNoteId: number;
  onLink: (input: CreateLinkRequest) => Promise<void>;
  onClose: () => void;
}

// Finding the other end of a Link, by browsing first and searching second. The order is the
// whole point: the user is reading, something recalls an earlier reading, and they will not
// remember how that older note was worded - so a search dropdown alone would make linking
// depend on the one thing they do not have (#67). The notes of the Source in front of them are
// offered without a query, and search is what reaches past that reading.
//
// One component for every path that needs it - the reading page's Link affordance now, Review
// later - which is why it takes the note it is linking from and a callback, and holds no
// knowledge of the page around it.
export function LinkPanel({ fromNoteId, onLink, onClose }: LinkPanelProps) {
  const [typed, setTyped] = useState('');
  const [query, setQuery] = useState('');

  // The query trails the typing by a beat, so a search runs on a phrase rather than on every
  // keystroke. Browsing the first tier never waits on it: the untyped state is its own cached
  // result.
  useEffect(() => {
    const timer = setTimeout(() => setQuery(typed.trim()), SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [typed]);

  const targets = useLinkTargets(fromNoteId, query, true);
  // The Topic tier reads from the Topics endpoint rather than from the tiers above, because a
  // Topic is a filing of notes and the panel's own query knows nothing about it (#87). It does
  // not wait on the search, for the same reason the first tier does not: it is browsing.
  const topicRelated = useTopicRelatedNotes(fromNoteId, true);

  const renderCandidates = (candidates: LinkTargetCandidate[]) => (
    <Stack as="ul" direction="column" gap="3" listStyleType="none" w="full">
      {candidates.map((candidate) => (
        <LinkCandidate
          key={candidate.note.id}
          candidate={candidate}
          fromNoteId={fromNoteId}
          onLink={(reason) =>
            onLink({ originNoteId: fromNoteId, targetNoteId: candidate.note.id, reason })
          }
        />
      ))}
    </Stack>
  );

  const sameSource = targets.data?.sameSource ?? [];
  const sameSourceIds = new Set(sameSource.map((candidate) => candidate.note.id));
  const topicCandidates = toTopicCandidates({
    related: topicRelated.data?.notes ?? [],
    existingLinks: targets.data?.existingLinks ?? [],
    fromNoteId,
    alreadyOffered: sameSourceIds,
  });
  // The search tier drops what the browsable tiers already offered, so a note appears once.
  const browsed = new Set([...sameSourceIds, ...topicCandidates.map((row) => row.note.id)]);
  const results = (targets.data?.results ?? []).filter((row) => !browsed.has(row.note.id));

  return (
    <Stack
      direction="column"
      gap="4"
      w="full"
      bg="paper"
      borderWidth="1px"
      borderColor="borderSoft"
      p="4"
      aria-label="Link this note"
      role="group"
    >
      <Stack align="center" justify="space-between" gap="3">
        <Text variant="eyebrow" color="moss">
          Link this note to
        </Text>
        <Button type="button" size="xs" variant="ghost" onClick={onClose}>
          Done
        </Button>
      </Stack>

      <Input
        value={typed}
        onChange={(event) => setTyped(event.target.value)}
        aria-label="Search your notes"
        placeholder="Search everything you have written"
        // eslint-disable-next-line jsx-a11y/no-autofocus -- the panel is opened by an explicit
        // action in order to find a note, and typing is one of the two ways to do that.
        autoFocus
      />

      {targets.isPending && <Spinner aria-label="Finding notes" />}
      {targets.isError && <Text variant="muted">Your notes could not be searched just now.</Text>}

      {sameSource.length > 0 && (
        <Stack direction="column" gap="2" w="full">
          <Text variant="eyebrow" color="inkSoft">
            From this reading
          </Text>
          {renderCandidates(sameSource)}
        </Stack>
      )}

      {topicCandidates.length > 0 && (
        <Stack direction="column" gap="2" w="full">
          <Text variant="eyebrow" color="inkSoft">
            Filed under the same Topic
          </Text>
          {renderCandidates(topicCandidates)}
        </Stack>
      )}

      {query !== '' && (
        <Stack direction="column" gap="2" w="full">
          <Text variant="eyebrow" color="inkSoft">
            Found
          </Text>
          {results.length > 0 ? (
            renderCandidates(results)
          ) : (
            <Text variant="muted">Nothing else you have written matches that.</Text>
          )}
        </Stack>
      )}

      {/* The empty box, said once rather than as two empty tiers: there is nothing to connect
          to yet, and nothing to search either. */}
      {!targets.isPending &&
        !targets.isError &&
        sameSource.length === 0 &&
        topicCandidates.length === 0 &&
        query === '' && (
          <Text variant="muted">
            Search for a note to link to - anything you have written is reachable from here.
          </Text>
        )}
    </Stack>
  );
}
