import { Button } from '../../atoms/Button/Button.tsx';
import { Stack } from '../../atoms/Stack/Stack.tsx';
import { Text } from '../../atoms/Text/Text.tsx';
import { Section } from './Section.tsx';
import { BUTTON_SIZES, BUTTON_VARIANTS } from './buttonVariants.ts';

export function ButtonDemo() {
  return (
    <Section title="Button" description="every variant × size, from atoms/Button">
      <Stack direction="column" gap="4">
        {BUTTON_VARIANTS.map((variant) => (
          <Stack key={variant} align="center" gap="3" wrap="wrap">
            <Text
              fontFamily="mono"
              fontSize="xs"
              textTransform="uppercase"
              color="inkSoft"
              w="24"
              flexShrink="0"
            >
              {variant}
            </Text>
            {BUTTON_SIZES.map((size) => (
              <Button key={size} variant={variant} size={size}>
                Button
              </Button>
            ))}
          </Stack>
        ))}
      </Stack>
    </Section>
  );
}
