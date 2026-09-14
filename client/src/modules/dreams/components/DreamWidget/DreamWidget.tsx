import { Link } from '@tanstack/react-router';
import { useDreamSummary } from '../../api/dreamHooks.ts';
import { toIsoDate } from '../../../../utils/dateUtils.ts';
import { excerpt } from '../../../../utils/textUtils.ts';
import { IndexCard } from '../../../../atoms/IndexCard/IndexCard.tsx';
import { LoadingGate } from '../../../../atoms/LoadingGate/LoadingGate.tsx';
import { Stack } from '../../../../atoms/Stack/Stack.tsx';
import { Text } from '../../../../atoms/Text/Text.tsx';
import { Button } from '../../../../atoms/Button/Button.tsx';
import { dreamAgePhrase } from './DreamWidget.utils.ts';

const SNIPPET_LENGTH = 120;

// ADR 0010: no counts, no streak, no cadence figure of any kind, and no
// explanatory line when nothing is eligible - the Re-encounter zone simply
// doesn't render and the card is visibly shorter on that side.
export function DreamWidget() {
  const asOf = toIsoDate(new Date());
  const { data, isPending } = useDreamSummary(asOf);

  return (
    <IndexCard label="Dream Journal" catalogNumber="No. 002" accent="moss">
      {isPending ? (
        <LoadingGate w="full" minH="120px" size="sm" />
      ) : (
        <Stack
          direction={{ base: 'column', md: 'row' }}
          gap="6"
          align={{ base: 'stretch', md: 'center' }}
        >
          <Stack direction="column" gap="3" align="flex-start" flex="3">
            <Text textStyle="cardTitle" color="ink">
              Record last night&rsquo;s dream
            </Text>
            {data && !data.hasAnyDreams && (
              <Text fontFamily="body" color="ink">
                When a dream follows you into the morning, this is the place to set it down.
              </Text>
            )}
            <Button asChild size="lg">
              <Link to="/dreams/new">Record a dream</Link>
            </Button>
          </Stack>

          {data?.reEncounter && (
            <Stack
              direction="column"
              gap="1"
              align="flex-start"
              flex="2"
              pl={{ base: '0', md: '6' }}
              pt={{ base: '4', md: '0' }}
              borderLeftWidth={{ base: '0', md: '1px' }}
              borderTopWidth={{ base: '1px', md: '0' }}
              borderColor="line"
            >
              <Text textStyle="label" color="inkSoft">
                See also
              </Text>
              <Stack asChild direction="column" gap="1" align="flex-start">
                <Link to="/dreams/$dreamId" params={{ dreamId: String(data.reEncounter.id) }}>
                  <Text textStyle="label" color="inkSoft">
                    {dreamAgePhrase(data.reEncounter.date)}
                  </Text>
                  <Text textStyle="body" color="ink">
                    {excerpt(data.reEncounter.narrative, SNIPPET_LENGTH)}
                  </Text>
                </Link>
              </Stack>
            </Stack>
          )}
        </Stack>
      )}
    </IndexCard>
  );
}
