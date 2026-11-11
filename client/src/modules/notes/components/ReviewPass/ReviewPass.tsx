import { useState } from 'react';
import { Link } from '@tanstack/react-router';
import type {
  CreateLinkRequest,
  CreatePermanentNoteRequest,
  LiteratureNote,
  ReviewAnswerKind,
  ReviewQueueNote,
} from '@nee3/shared-types';
import { Button } from '../../../../atoms/Button/Button.tsx';
import { EmptyState } from '../EmptyState/EmptyState.tsx';
import { PassSummary } from './PassSummary/PassSummary.tsx';
import { ReviewNoteCard } from './ReviewNoteCard/ReviewNoteCard.tsx';
import { EMPTY_TALLY, addToTally, reviewStage } from './ReviewPass.utils.ts';

export interface ReviewPassProps {
  // The queue as it was read, in band order. Held still for the length of the pass: an Answer
  // changes which band its note is in, and a list that re-sorted itself under the user would
  // move the next card while they were reading this one.
  notes: ReviewQueueNote[];
  // The length of the first band, which is where the pass ends and what the rail badge reads.
  dueCount: number;
  // Each of these resolves once the Answer has been recorded, so a failure leaves the card
  // where it is and the note due.
  onNothingHere: (note: LiteratureNote) => Promise<void>;
  onLink: (note: LiteratureNote, input: CreateLinkRequest) => Promise<void>;
  onWritePermanentNote: (note: LiteratureNote, input: CreatePermanentNoteRequest) => Promise<void>;
  onClearOpenQuestion: (note: LiteratureNote) => Promise<void>;
  onStartAgain: () => void;
}

// One note at a time, then the card that closes the pass. The whole state of a sitting is an
// index into the queue and a count of what came of it: there is nothing else to hold, because
// due-ness lives in the Answer history rather than on the note (ADR 0011), and the only thing
// a pass accumulates is its harvest.
export function ReviewPass({
  notes,
  dueCount,
  onNothingHere,
  onLink,
  onWritePermanentNote,
  onClearOpenQuestion,
  onStartAgain,
}: ReviewPassProps) {
  const [index, setIndex] = useState(0);
  const [continued, setContinued] = useState(false);
  const [tally, setTally] = useState(EMPTY_TALLY);

  // The card advances only once the Answer is in, which is what "recorded on completion, never
  // on intent" means from this side: a write that fails leaves the note in front of the user.
  const advance = (answer: ReviewAnswerKind) => {
    setTally((current) => addToTally(current, answer));
    setIndex((current) => current + 1);
  };

  const stage = reviewStage({ notes, dueCount, index, continued });

  if (stage.kind === 'nothing-written') {
    return (
      <EmptyState
        action={
          <Button asChild>
            <Link to="/notes/read">Go and read something</Link>
          </Button>
        }
      >
        Review hands back the notes you wrote while reading, one at a time, and asks what of your
        own is in them. There is nothing to hand back yet.
      </EmptyState>
    );
  }

  if (stage.kind === 'pass-end') {
    return (
      <PassSummary
        tally={tally}
        heading={
          dueCount === 0
            ? 'Nothing is waiting for you.'
            : 'That is every note you had not answered.'
        }
        onKeepGoing={stage.moreAvailable ? () => setContinued(true) : undefined}
        onStartAgain={onStartAgain}
      />
    );
  }

  if (stage.kind === 'everything-seen') {
    return (
      <PassSummary
        tally={tally}
        heading="That is the whole box, for now."
        onStartAgain={onStartAgain}
      />
    );
  }

  const { note } = stage.queued;

  return (
    <ReviewNoteCard
      // The card holds its own open-question and composer state, and that state belongs to the
      // note it was opened on rather than to the position in the queue.
      key={note.id}
      queued={stage.queued}
      onNothingHere={async () => {
        await onNothingHere(note);
        advance('nothing_here');
      }}
      onLink={async (input) => {
        await onLink(note, input);
        advance('link_made');
      }}
      onWritePermanentNote={async (input) => {
        await onWritePermanentNote(note, input);
        advance('permanent_note_written');
      }}
      onClearOpenQuestion={() => onClearOpenQuestion(note)}
    />
  );
}
