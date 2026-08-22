import { createFileRoute } from '@tanstack/react-router';
import { Stack } from '../atoms/Stack/Stack.tsx';

export const Route = createFileRoute('/')({
  component: () => (
    <Stack direction="column" p="4">
      Aeternus.3
    </Stack>
  ),
});
