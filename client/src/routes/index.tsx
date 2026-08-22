import { createFileRoute } from '@tanstack/react-router';
import { Dashboard } from '../shell/Dashboard.tsx';
import { requireAuth } from '../auth/requireAuth.ts';

export const Route = createFileRoute('/')({
  component: Dashboard,
  beforeLoad: ({ context, location }) => requireAuth(context.queryClient)({ location }),
});
