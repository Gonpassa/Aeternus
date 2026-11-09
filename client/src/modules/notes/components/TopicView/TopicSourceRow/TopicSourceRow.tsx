import { Link } from '@tanstack/react-router';
import type { Source } from '@nee3/shared-types';
import { Stack } from '../../../../../atoms/Stack/Stack.tsx';
import { Text } from '../../../../../atoms/Text/Text.tsx';
import { SOURCE_KIND_LABEL } from '../../../sourceKinds.ts';

export interface TopicSourceRowProps {
  source: Source;
}

// One Source carrying the Topic, as a row leading to its reading page - which is where the
// Literature notes written from it are, and why this view does not list them itself
// (CONTEXT.md, Topic view).
export function TopicSourceRow({ source }: TopicSourceRowProps) {
  return (
    <Stack
      as="li"
      direction="column"
      borderBottomWidth="1px"
      borderBottomColor="borderSoft"
      _last={{ borderBottomWidth: 0 }}
    >
      <Stack
        asChild
        direction="row"
        align="baseline"
        justify="space-between"
        gap="4"
        px="1"
        py="3"
        _hover={{ bg: 'paperCard' }}
      >
        <Link to="/notes/read/$sourceId" params={{ sourceId: String(source.id) }}>
          <Stack direction="column" gap="1">
            <Text textStyle="bodyStrong" color="ink">
              {source.title}
            </Text>
            {/* No "No author" placeholder: a Source without one is not missing anything. */}
            {source.author && (
              <Text textStyle="body" color="inkSoft">
                {source.author}
              </Text>
            )}
          </Stack>
          <Text textStyle="label" color="inkSoft" whiteSpace="nowrap">
            {SOURCE_KIND_LABEL[source.kind]}
          </Text>
        </Link>
      </Stack>
    </Stack>
  );
}
