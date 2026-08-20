import { createFileRoute, redirect } from '@tanstack/react-router';
import { ComponentsShowcase } from '../../dev/ComponentsShowcase/ComponentsShowcase.tsx';

export const Route = createFileRoute('/dev/components')({
  beforeLoad: () => {
    if (import.meta.env.PROD) {
      throw redirect({ to: '/' });
    }
  },
  component: ComponentsShowcase,
});
