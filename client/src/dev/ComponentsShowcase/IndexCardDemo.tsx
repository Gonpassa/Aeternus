import { IndexCard } from '../../atoms/IndexCard/IndexCard.tsx';
import { Stack } from '../../atoms/Stack/Stack.tsx';
import { Section } from './Section.tsx';

export function IndexCardDemo() {
  return (
    <Section
      title="IndexCard"
      description="die-cut tab and mono catalog number, from atoms/IndexCard"
    >
      <Stack gap="4" wrap="wrap" align="flex-start">
        <Stack w="18rem" direction="column">
          <IndexCard label="Journal" catalogNumber="No. 014">
            Started the morning with coffee on the porch and a page of longhand notes before
            anything else.
          </IndexCard>
        </Stack>
        <Stack w="18rem" direction="column">
          <IndexCard label="Catalog" catalogNumber="No. 032" accent="moss">
            A second category, using the moss accent instead of rust.
          </IndexCard>
        </Stack>
        <Stack w="18rem" direction="column">
          <IndexCard label="Journal" catalogNumber="No. 041" />
        </Stack>
      </Stack>
    </Section>
  );
}
