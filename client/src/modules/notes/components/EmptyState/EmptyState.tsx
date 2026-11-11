import type { ReactNode } from 'react';
import { Heading } from '../../../../atoms/Heading/Heading.tsx';
import { Stack } from '../../../../atoms/Stack/Stack.tsx';
import { Text } from '../../../../atoms/Text/Text.tsx';

export interface EmptyStateProps {
  // The line that says what is missing. Left off where the page heading already says it.
  heading?: string;
  // What this page becomes once there is something on it.
  children: ReactNode;
  // The one thing to do about it, where there is one.
  action?: ReactNode;
}

// What a Notes page shows before there is anything on it: Read with no Sources, Review with no
// notes, Topics with no Topics. One layout for all three so they cannot drift apart - a short
// measure of text set at the left edge of the page's column, which the page itself centers
// (#104).
export function EmptyState({ heading, children, action }: EmptyStateProps) {
  return (
    <Stack direction="column" gap="4" align="flex-start" maxW="30rem" pt="4">
      {heading !== undefined && (
        <Heading as="h2" variant="section">
          {heading}
        </Heading>
      )}
      <Text textStyle="body" color="inkSoft">
        {children}
      </Text>
      {action}
    </Stack>
  );
}
