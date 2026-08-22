import type { ReactNode } from 'react';

export type WidgetSpan = 'small' | 'medium' | 'large';

export interface DashboardWidget {
  id: string;
  title: string;
  span: WidgetSpan;
  render: () => ReactNode;
}
