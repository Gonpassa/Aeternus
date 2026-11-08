import { Link } from '@tanstack/react-router';
import type { SourceListEntry } from '@nee3/shared-types';
import { countLabel } from '../../../../../utils/countLabel.ts';
import { Heading } from '../../../../../atoms/Heading/Heading.tsx';
import { IndexCard } from '../../../../../atoms/IndexCard/IndexCard.tsx';
import { Stack } from '../../../../../atoms/Stack/Stack.tsx';
import { Text } from '../../../../../atoms/Text/Text.tsx';
import { SOURCE_KIND_LABEL } from '../../../sourceKinds.ts';
import { lastNoteLabel } from './SourceCard.utils.ts';

export interface SourceCardProps {
  source: SourceListEntry;
}

// The catalog's unit: one Source as an index card, kind on the die-cut tab and note count in
// the catalog number. Both numbers on it are derived per request rather than stored, because
// the recency of a Source's Literature notes is the only signal that it is active - a Source
// has no status to show (CONTEXT.md, Source).
export function SourceCard({ source }: SourceCardProps) {
  const read = source.noteCount > 0;

  // The whole card is the link, not just its title: a catalog card is one target. `asChild`
  // hands the anchor the layout, so the cards in a row still size to the tallest of them.
  return (
    <Stack asChild h="full">
      <Link to="/notes/read/$sourceId" params={{ sourceId: String(source.id) }}>
        <IndexCard
          label={SOURCE_KIND_LABEL[source.kind]}
          catalogNumber={read ? countLabel(source.noteCount, 'note', 'notes') : 'No notes'}
          // The accent carries the one distinction the card makes: rust for a Source that has
          // been written from, the quieter ink-blue for one still waiting to be.
          accent={read ? 'rust' : 'inkBlue'}
          flex="1"
          pb="10"
          _hover={{ bg: 'paper' }}
        >
          <Stack direction="column" gap="2" pt="1">
            <Heading as="h2" variant="card">
              {source.title}
            </Heading>
            {/* No "No author" placeholder: a Source without one is not missing anything, so
                the line is simply absent rather than reporting its own absence. */}
            {source.author && (
              <Text textStyle="body" color="inkSoft">
                {source.author}
              </Text>
            )}
            <Text textStyle="label" color="inkSoft" mt="2">
              {lastNoteLabel(source.lastNoteAt)}
            </Text>
          </Stack>
        </IndexCard>
      </Link>
    </Stack>
  );
}
