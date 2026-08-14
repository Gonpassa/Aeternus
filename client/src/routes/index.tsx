import { createFileRoute } from '@tanstack/react-router';
import { Box } from '@chakra-ui/react';

export const Route = createFileRoute('/')({
  component: () => <Box p="4">Aeternus.3</Box>,
});
