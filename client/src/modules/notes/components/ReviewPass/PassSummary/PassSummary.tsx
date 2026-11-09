import { Button } from '../../../../../atoms/Button/Button.tsx';
import { IndexCard } from '../../../../../atoms/IndexCard/IndexCard.tsx';
import { Stack } from '../../../../../atoms/Stack/Stack.tsx';
import { Text } from '../../../../../atoms/Text/Text.tsx';
import { harvestLine, type SittingTally } from '../ReviewPass.utils.ts';

export interface PassSummaryProps {
  tally: SittingTally;
  // The line that closes the sitting. A pass ending and the whole box having been seen are
  // different endings, and the page says which one this is.
  heading: string;
  // Carrying on into the notes already answered, offered only when there are any. Not a second
  // pass: the same sitting, continuing past the boundary.
  onKeepGoing?: () => void;
  // Reading the queue again, which is how a note filed since the sitting began comes into view.
  onStartAgain: () => void;
}

// What a pass closes on. There is nothing to show here but what the sitting produced: no
// interval, no next-due date, no pass count and no streak, because the box is a standing
// invitation rather than a debt that was paid down (ADR 0016).
export function PassSummary({ tally, heading, onKeepGoing, onStartAgain }: PassSummaryProps) {
  const harvest = harvestLine(tally);

  return (
    <IndexCard
      as="section"
      aria-label={heading}
      label="This sitting"
      catalogNumber=""
      accent="inkBlue"
      pt="7"
      pb="9"
    >
      <Stack direction="column" gap="4" pt="1">
        <Text textStyle="cardTitle" color="ink">
          {heading}
        </Text>
        {harvest !== null ? (
          <Text textStyle="body" color="inkSoft">
            {harvest}
          </Text>
        ) : (
          <Text textStyle="body" color="inkSoft">
            Nothing came of this one, which is its own kind of answer.
          </Text>
        )}
        <Stack gap="3" wrap="wrap">
          {onKeepGoing && (
            <Button type="button" variant="outline" onClick={onKeepGoing}>
              Look again at notes you have answered
            </Button>
          )}
          <Button type="button" variant="ghost" onClick={onStartAgain}>
            Read the queue again
          </Button>
        </Stack>
      </Stack>
    </IndexCard>
  );
}
