import { useState } from 'react';
import type {
  CreateLinkRequest,
  CreatePermanentNoteRequest,
  ReviewQueueNote,
} from '@nee3/shared-types';
import { Button } from '../../../../../atoms/Button/Button.tsx';
import { IndexCard } from '../../../../../atoms/IndexCard/IndexCard.tsx';
import { Stack } from '../../../../../atoms/Stack/Stack.tsx';
import { Text } from '../../../../../atoms/Text/Text.tsx';
import { formatLocator, literatureNoteHeading } from '../../../utils/noteLabel.ts';
import { LinkPanel } from '../../LinkPanel/LinkPanel.tsx';
import { PermanentNoteComposer } from '../../PermanentNoteComposer/PermanentNoteComposer.tsx';
import { TopicTags } from '../../TopicTags/TopicTags.tsx';

export interface ReviewNoteCardProps {
  queued: ReviewQueueNote;
  // "Nothing of mine here" - a complete and successful outcome, and the one most notes get
  // (ADR 0016). It is one press because it is one thought, not a form.
  onNothingHere: () => Promise<void>;
  // The other two Answers are recorded by their callers once the Link or the Permanent note
  // actually exists, so abandoning either composer records nothing (ADR 0011).
  onLink: (input: CreateLinkRequest) => Promise<void>;
  onWritePermanentNote: (input: CreatePermanentNoteRequest) => Promise<void>;
  onClearOpenQuestion: () => Promise<void>;
}

// One Literature note, handed back as the large card it was written on and labelled by the
// Source it came from, with the one question Review asks: what, if anything, of your own is in
// this (CONTEXT.md, Review). The three Answers sit under it and nothing else does - no
// interval, no next-due date, no pass count, no streak, and nothing that says the note is late
// (ADR 0016).
export function ReviewNoteCard({
  queued,
  onNothingHere,
  onLink,
  onWritePermanentNote,
  onClearOpenQuestion,
}: ReviewNoteCardProps) {
  const { note, sourceTitle, inheritedTopics } = queued;
  const [excerptShown, setExcerptShown] = useState(false);
  const [linkPanelOpen, setLinkPanelOpen] = useState(false);
  const [composerOpen, setComposerOpen] = useState(false);
  // The flag is cleared through the note's own endpoint, and the queue is deliberately not
  // refetched mid-pass, so the card remembers the clearing it just made rather than showing a
  // flag the user has already taken off.
  const [openQuestion, setOpenQuestion] = useState(note.openQuestion);
  const [answering, setAnswering] = useState(false);

  const heading = literatureNoteHeading({ sourceTitle, ...note });

  return (
    <Stack direction="column" gap="4" w="full">
      <IndexCard
        as="article"
        aria-label={heading}
        // The Source labels the card, because that is what the user is being reminded they
        // were reading; the Locator keeps the corner it keeps everywhere else.
        label={sourceTitle}
        catalogNumber={formatLocator(note)}
        accent={openQuestion ? 'rust' : 'moss'}
        minH="18rem"
        pt="8"
        pb="12"
      >
        <Stack direction="column" gap="4" pt="2">
          {openQuestion && (
            <Stack align="baseline" justify="space-between" gap="3" wrap="wrap">
              <Text variant="eyebrow" color="rust">
                Open question
              </Text>
              {/* Orthogonal to the Answers: no Answer resolves an open question, and it is
                  usually settled by later reading rather than here, so clearing it is its own
                  quiet action and does not answer anything (CONTEXT.md, Open question). */}
              <Button
                type="button"
                size="xs"
                variant="ghost"
                onClick={async () => {
                  try {
                    await onClearOpenQuestion();
                    setOpenQuestion(false);
                  } catch {
                    // The global toast interceptor in api/client.ts has already said so, and a
                    // flag that was not cleared stays on the card.
                  }
                }}
              >
                This is settled now
              </Button>
            </Stack>
          )}
          <Text textStyle="body" fontSize="1.1875rem" color="ink" whiteSpace="pre-wrap">
            {note.body}
          </Text>
          {note.excerpt !== null && (
            <Stack direction="column" gap="2" align="flex-start">
              <Button
                type="button"
                size="xs"
                variant="ghost"
                aria-expanded={excerptShown}
                onClick={() => setExcerptShown(!excerptShown)}
              >
                {excerptShown ? "Hide the author's words" : "The author's words"}
              </Button>
              {excerptShown && (
                <Text
                  textStyle="body"
                  color="inkSoft"
                  whiteSpace="pre-wrap"
                  bg="paper"
                  borderLeftWidth="3px"
                  borderLeftColor="rust"
                  pl="3"
                  py="2"
                  w="full"
                >
                  {note.excerpt}
                </Text>
              )}
            </Stack>
          )}
          <TopicTags
            topics={inheritedTopics}
            caption="From the Source"
            label="Topics inherited from the Source"
          />
        </Stack>
      </IndexCard>

      <Stack direction="column" gap="3" w="full">
        <Text variant="eyebrow" color="inkSoft">
          Is anything of yours in this?
        </Text>
        {/* The three Answers, side by side and equally weighted: none of them is the right one
            and none of them is a grade (ADR 0016). */}
        <Stack gap="3" wrap="wrap">
          <Button
            type="button"
            variant="outline"
            loading={answering}
            onClick={async () => {
              setAnswering(true);
              try {
                await onNothingHere();
              } catch {
                // The global toast interceptor in api/client.ts has already surfaced the
                // failure, and the note stays in front of the user, still unanswered.
              } finally {
                setAnswering(false);
              }
            }}
          >
            Nothing of mine here
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              setComposerOpen(false);
              setLinkPanelOpen(true);
            }}
          >
            Link to another note
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              setLinkPanelOpen(false);
              setComposerOpen(true);
            }}
          >
            Write a Permanent note from it
          </Button>
        </Stack>

        {/* The panel and the composer built for the reading page, reused exactly: Review writes
            with nothing of its own, which is why the panel is keyed on the note being linked
            from rather than on a Source (#85). Closing either records no Answer, and the note
            stays due (ADR 0011). */}
        {linkPanelOpen && (
          <LinkPanel fromNoteId={note.id} onLink={onLink} onClose={() => setLinkPanelOpen(false)} />
        )}

        {composerOpen && (
          <PermanentNoteComposer
            targetNoteId={note.id}
            targetLabel={heading}
            initialTopicNames={inheritedTopics.map((topic) => topic.name)}
            onWrite={onWritePermanentNote}
            onDiscard={() => setComposerOpen(false)}
          />
        )}
      </Stack>
    </Stack>
  );
}
