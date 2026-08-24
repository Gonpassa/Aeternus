import { Button } from '../../atoms/Button/Button.tsx';
import { Stack } from '../../atoms/Stack/Stack.tsx';
import { Section } from './Section.tsx';
import { BUTTON_VARIANTS } from './buttonVariants.ts';

export function ButtonDisabledDemo() {
  return (
    <Section title="Button (disabled)" description="every variant, disabled">
      <Stack align="center" gap="3" wrap="wrap">
        {BUTTON_VARIANTS.map((variant) => (
          <Button key={variant} variant={variant} disabled>
            {variant}
          </Button>
        ))}
      </Stack>
    </Section>
  );
}
