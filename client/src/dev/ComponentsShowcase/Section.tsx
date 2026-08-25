import { PropsWithChildren } from 'react';
import { Stack } from '../../atoms/Stack/Stack.tsx';
import { Heading } from '../../atoms/Heading/Heading.tsx';
import { Text } from '../../atoms/Text/Text.tsx';

export function Section({
  title,
  description,
  children,
}: PropsWithChildren<{
  title: string;
  description?: string;
}>) {
  return (
    <Stack as="section" direction="column" mb="12">
      <Heading as="h2" variant="section" mb="1">
        {title}
      </Heading>
      {description && (
        <Text fontFamily="body" fontSize="sm" color="inkSoft" mb="4">
          {description}
        </Text>
      )}
      {children}
    </Stack>
  );
}
