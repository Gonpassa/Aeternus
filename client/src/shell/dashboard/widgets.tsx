import { JournalWidget } from '../../modules/journal/components/JournalWidget/JournalWidget.tsx';
import { DreamWidget } from '../../modules/dreams/components/DreamWidget/DreamWidget.tsx';
import type { DashboardWidget } from './types.ts';

export const dashboardWidgets: DashboardWidget[] = [
  {
    id: 'journal',
    title: 'Journal',
    span: 'medium',
    render: () => <JournalWidget />,
  },
  {
    id: 'dreams',
    title: 'Dream Journal',
    span: 'medium',
    render: () => <DreamWidget />,
  },
];
