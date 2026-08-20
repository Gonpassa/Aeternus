import { PropsWithChildren } from 'react';
import { Nav } from './Nav.tsx';
import { Stack } from '../components/ui/Stack/Stack.tsx';

export function Layout({ children }: PropsWithChildren) {
  return (
    <Stack
      h={{ base: 'auto', md: '100vh' }}
      minH="100vh"
      direction={{ base: 'column', md: 'row' }}
      bg="paper"
      color="ink"
    >
      <Nav />
      <Stack
        as="main"
        direction="column"
        flex="1"
        minH="0"
        overflowY="auto"
        px={{ base: '5', md: '14' }}
        py={{ base: '8', md: '12' }}
      >
        {children}
      </Stack>
    </Stack>
  );
}
