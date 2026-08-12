import { PropsWithChildren } from 'react';
import { Box } from '@chakra-ui/react';
import { Nav } from './Nav.tsx';

export function Layout({ children }: PropsWithChildren) {
  return (
    <Box minH="100vh" bg="paper" color="ink">
      <Nav />
      <Box as="main" p="4">
        {children}
      </Box>
    </Box>
  );
}
