import { Stack } from '../../atoms/Stack/Stack.tsx';
import { ToolbarActionButton } from '../../atoms/ToolbarActionButton/ToolbarActionButton.tsx';
import { Section } from './Section.tsx';

export function ToolbarActionButtonDemo() {
  return (
    <Section
      title="ToolbarActionButton"
      description="stateless action buttons, from atoms/ToolbarActionButton"
    >
      <Stack gap="2">
        <ToolbarActionButton onClick={() => {}}>Clear marks</ToolbarActionButton>
        <ToolbarActionButton onClick={() => {}}>Clear nodes</ToolbarActionButton>
      </Stack>
    </Section>
  );
}
