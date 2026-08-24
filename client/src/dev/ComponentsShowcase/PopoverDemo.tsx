import { Button } from '../../atoms/Button/Button.tsx';
import { Popover, PopoverContent, PopoverTrigger } from '../../atoms/Popover/Popover.tsx';
import { Text } from '../../atoms/Text/Text.tsx';
import { Section } from './Section.tsx';

export function PopoverDemo() {
  return (
    <Section title="Popover" description="click the trigger to open a floating panel">
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="outline">Open popover</Button>
        </PopoverTrigger>
        <PopoverContent>
          <Text fontFamily="body" color="ink">
            Popover content goes here.
          </Text>
        </PopoverContent>
      </Popover>
    </Section>
  );
}
