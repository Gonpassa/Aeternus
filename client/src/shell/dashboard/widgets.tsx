import { JournalWidget } from '../../modules/journal/components/JournalWidget/JournalWidget.tsx';
import type { DashboardWidget } from './types.ts';

export const dashboardWidgets: DashboardWidget[] = [
  {
    id: 'journal',
    title: 'Journal',
    span: 'medium',
    render: () => <JournalWidget />,
  },
];
