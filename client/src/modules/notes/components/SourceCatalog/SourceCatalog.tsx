import { useState } from 'react';
import { Link } from '@tanstack/react-router';
import type { SourceListEntry } from '@nee3/shared-types';
import { Button } from '../../../../atoms/Button/Button.tsx';
import { Grid } from '../../../../atoms/Grid/Grid.tsx';
import { Heading } from '../../../../atoms/Heading/Heading.tsx';
import { Stack } from '../../../../atoms/Stack/Stack.tsx';
import { Text } from '../../../../atoms/Text/Text.tsx';
import { SourceCard } from './SourceCard/SourceCard.tsx';
import { TopicFilterStrip } from './TopicFilterStrip/TopicFilterStrip.tsx';
import { catalogTopics, filterSourcesByTopic } from './SourceCatalog.utils.ts';

export interface SourceCatalogProps {
  sources: SourceListEntry[];
}

// The catalog grid, filterable by Topic. Sources arrive in the order the API sends them - by most
// recent Literature note, with Sources that have none last - so this component only ever narrows
// that order, never reorders it. The filter is held here rather than in the URL: it is a way of
// looking at the shelf, not a page of its own, and the Topic view that is a page is #88.
export function SourceCatalog({ sources }: SourceCatalogProps) {
  const [topicId, setTopicId] = useState<number | null>(null);

  if (sources.length === 0) {
    return (
      <Stack direction="column" gap="4" align="flex-start" maxW="30rem" pt="4">
        <Heading as="h2" variant="section">
          Nothing on the shelf yet.
        </Heading>
        <Text textStyle="body" color="inkSoft">
          Add the book or the article you are reading, and this becomes the catalog you file your
          notes against.
        </Text>
        <Button asChild>
          <Link to="/notes/read/new">Add the first Source</Link>
        </Button>
      </Stack>
    );
  }

  const shown = filterSourcesByTopic(sources, topicId);

  return (
    <Stack direction="column" gap="4">
      <TopicFilterStrip
        topics={catalogTopics(sources)}
        selectedTopicId={topicId}
        onSelect={setTopicId}
      />

      {/* A filter that matches nothing says so rather than showing the empty shelf's invitation
          to add a first Source: the shelf is not empty, this way of looking at it is. */}
      {shown.length === 0 ? (
        <Text variant="muted" pt="3">
          Nothing on the shelf carries that Topic.
        </Text>
      ) : (
        <Grid
          templateColumns={{ base: '1fr', md: 'repeat(2, 1fr)', xl: 'repeat(3, 1fr)' }}
          gap="6"
          pt="3"
        >
          {shown.map((source) => (
            <SourceCard key={source.id} source={source} />
          ))}
        </Grid>
      )}
    </Stack>
  );
}
