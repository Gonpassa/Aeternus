import { Button } from '../../atoms/Button/Button.tsx';
import { Stack } from '../../atoms/Stack/Stack.tsx';
import { Section } from './Section.tsx';
import { BUTTON_VARIANTS } from './buttonVariants.ts';

export function ButtonLoadingDemo() {
  return (
    <Section title="Button (loading)" description="every variant, loading">
      <Stack align="center" gap="3" wrap="wrap">
        {BUTTON_VARIANTS.map((variant) => (
          <Button key={variant} variant={variant} loading loadingText="Saving">
            {variant}
          </Button>
        ))}
      </Stack>
    </Section>
  );
}
