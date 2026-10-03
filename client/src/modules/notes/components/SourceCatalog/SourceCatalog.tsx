import { Link } from '@tanstack/react-router';
import type { SourceListEntry } from '@nee3/shared-types';
import { Button } from '../../../../atoms/Button/Button.tsx';
import { Grid } from '../../../../atoms/Grid/Grid.tsx';
import { Heading } from '../../../../atoms/Heading/Heading.tsx';
import { Stack } from '../../../../atoms/Stack/Stack.tsx';
import { Text } from '../../../../atoms/Text/Text.tsx';
import { SourceCard } from './SourceCard/SourceCard.tsx';

export interface SourceCatalogProps {
  sources: SourceListEntry[];
}

// The catalog grid. Sources arrive in the order the API sends them - by most recent Literature
// note, with Sources that have none last - so this component does no sorting of its own.
// There is no Topic filter strip yet: Topics arrive with their own ticket.
export function SourceCatalog({ sources }: SourceCatalogProps) {
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

  return (
    <Grid
      templateColumns={{ base: '1fr', md: 'repeat(2, 1fr)', xl: 'repeat(3, 1fr)' }}
      gap="6"
      pt="3"
    >
      {sources.map((source) => (
        <SourceCard key={source.id} source={source} />
      ))}
    </Grid>
  );
}
