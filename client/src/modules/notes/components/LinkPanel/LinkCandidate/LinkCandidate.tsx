import { useState } from 'react';
import type { LinkTargetCandidate } from '@nee3/shared-types';
import { Button } from '../../../../../atoms/Button/Button.tsx';
import { Stack } from '../../../../../atoms/Stack/Stack.tsx';
import { Text } from '../../../../../atoms/Text/Text.tsx';
import { noteKindLabel, noteNameplate, openingWords } from '../../../utils/noteLabel.ts';
import { attributeReasons } from '../../../utils/linkReason.ts';
import { ReasonField } from '../../ReasonField/ReasonField.tsx';

export interface LinkCandidateProps {
  candidate: LinkTargetCandidate;
  // The note the Link would be made from, so an existing Link's two reasons can be attributed
  // to the ends that wrote them (ADR 0013).
  fromNoteId: number;
  onLink: (reason: string) => Promise<void>;
}

// One note offered as the other end of a Link, readable where it is found: a row the user has
// to open to recognize would put back the dependence on remembering an older note's wording
// that this panel exists to remove (#67).
//
// Picking it asks for the reason rather than making the Link - the reason is required at link
// time, and it is a report of the thought that produced the connection rather than a
// justification reconstructed afterwards (ADR 0015). Where the pair is already linked, the
// Link that is there is shown instead of a second being offered, and this end is asked for its
// own line if it has not given one (ADR 0013).
export function LinkCandidate({ candidate, fromNoteId, onLink }: LinkCandidateProps) {
  const [picked, setPicked] = useState(false);
  const { note, sourceTitle, existingLink } = candidate;
  const { heading, detail } = noteNameplate({ note, sourceTitle });
  // A Permanent note's nameplate is its claim, so its opening words are the preview that makes
  // the row readable; a Literature note's opening words are already its nameplate's second
  // line.
  const preview = note.kind === 'permanent' ? openingWords(note.body) : null;

  // Which reason this end owns on a Link that already exists, and which is the other end's.
  const { ownReason, otherReason } = attributeReasons(existingLink, fromNoteId);

  return (
    <Stack
      as="li"
      direction="column"
      gap="1"
      borderLeftWidth="2px"
      borderLeftColor="borderSoft"
      pl="3"
      py="1"
    >
      <Text variant="eyebrow" color="inkSoft">
        {noteKindLabel(note)}
      </Text>
      <Text textStyle="bodyStrong" color="ink">
        {heading}
      </Text>
      {detail !== null && (
        <Text textStyle="body" color="inkSoft">
          {detail}
        </Text>
      )}
      {preview !== null && (
        <Text textStyle="body" color="inkSoft">
          {preview}
        </Text>
      )}

      {/* What the pair already says, when it says anything: the panel shows the Link rather
          than offering a second one. */}
      {otherReason !== null && (
        <Text textStyle="body" color="ink">
          {otherReason}
        </Text>
      )}
      {ownReason !== null && (
        <Text textStyle="body" color="inkSoft">
          {ownReason}
        </Text>
      )}

      {ownReason !== null ? (
        <Text variant="eyebrow" color="moss">
          Already linked
        </Text>
      ) : (
        <Stack direction="column" gap="2" align="flex-start" w="full">
          {picked ? (
            <ReasonField
              id={`link-candidate-error-${note.id}`}
              submitLabel={existingLink === null ? 'Link these' : 'Add your reason'}
              onSubmit={async (reason) => {
                await onLink(reason);
                setPicked(false);
              }}
              onCancel={() => setPicked(false)}
            />
          ) : (
            <Button type="button" size="xs" variant="ghost" onClick={() => setPicked(true)}>
              {existingLink === null ? 'Link to this' : 'Say why from this end'}
            </Button>
          )}
        </Stack>
      )}
    </Stack>
  );
}
