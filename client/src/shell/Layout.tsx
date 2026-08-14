import { PropsWithChildren } from 'react';
import { Box, Flex } from '@chakra-ui/react';
import { Nav } from './Nav.tsx';

export function Layout({ children }: PropsWithChildren) {
  return (
    <Flex minH="100vh" direction={{ base: 'column', md: 'row' }} bg="paper" color="ink">
      <Nav />
      <Box as="main" flex="1" px={{ base: '5', md: '14' }} py={{ base: '8', md: '12' }}>
        {children}
      </Box>
    </Flex>
  );
}
