import { DieCutTab } from '../../atoms/DieCutTab/DieCutTab.tsx';
import { Stack } from '../../atoms/Stack/Stack.tsx';
import { Section } from './Section.tsx';

export function DieCutTabDemo() {
  return (
    <Section
      title="DieCutTab"
      description="reusable die-cut tab label, from atoms/DieCutTab, color variants"
    >
      <Stack gap="4" wrap="wrap" align="flex-start">
        <DieCutTab color="rust">Rust</DieCutTab>
        <DieCutTab color="moss">Moss</DieCutTab>
        <DieCutTab color="inkBlue">Ink blue</DieCutTab>
      </Stack>
    </Section>
  );
}
