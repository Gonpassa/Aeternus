import { Grid, GridItem } from '../../atoms/Grid/Grid.tsx';
import type { DashboardWidget } from './types.ts';

const MD_COLUMN_SPAN: Record<DashboardWidget['span'], number> = {
  small: 1,
  medium: 2,
  large: 2,
};

export function DashboardGrid({ widgets }: { widgets: DashboardWidget[] }) {
  return (
    <Grid templateColumns={{ base: '1fr', md: 'repeat(2, 1fr)' }} gap="6">
      {widgets.map((widget) => (
        <GridItem key={widget.id} colSpan={{ base: 1, md: MD_COLUMN_SPAN[widget.span] }}>
          {widget.render()}
        </GridItem>
      ))}
    </Grid>
  );
}
