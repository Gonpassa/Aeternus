import { useAuth } from './AuthProvider.tsx';
import { dashboardWidgets } from './dashboard/widgets.tsx';
import { DashboardGrid } from './dashboard/DashboardGrid.tsx';
import { PageContainer } from '../atoms/PageContainer/PageContainer.tsx';
import { Stack } from '../atoms/Stack/Stack.tsx';
import { Heading } from '../atoms/Heading/Heading.tsx';
import { Text } from '../atoms/Text/Text.tsx';

const formatDateLine = (date: Date): string =>
  date
    .toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })
    .toUpperCase();

export function Dashboard() {
  const { user } = useAuth();
  const greeting = user ? `Good to see you, ${user.username}.` : 'Good to see you.';

  return (
    <PageContainer maxW="2xl">
      <Stack direction="column" gap="1" mb="10">
        <Heading as="h1" variant="page">
          {greeting}
        </Heading>
        <Text variant="eyebrow" color="inkSoft">
          {formatDateLine(new Date())}
        </Text>
      </Stack>
      <DashboardGrid widgets={dashboardWidgets} />
    </PageContainer>
  );
}
