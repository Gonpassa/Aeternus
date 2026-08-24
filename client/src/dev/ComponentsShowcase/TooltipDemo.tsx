import { Button } from '../../atoms/Button/Button.tsx';
import { Tooltip } from '../../atoms/Tooltip/Tooltip.tsx';
import { Section } from './Section.tsx';

export function TooltipDemo() {
  return (
    <Section title="Tooltip" description="hover or focus the trigger to reveal content">
      <Tooltip content="This is tooltip content">
        <Button variant="outline">Hover me</Button>
      </Tooltip>
    </Section>
  );
}
