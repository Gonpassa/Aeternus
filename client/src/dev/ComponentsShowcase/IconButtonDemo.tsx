import { ChevronLeft, Star } from 'lucide-react';
import { IconButton } from '../../atoms/IconButton/IconButton.tsx';
import { Stack } from '../../atoms/Stack/Stack.tsx';
import { Text } from '../../atoms/Text/Text.tsx';
import { Section } from './Section.tsx';
import { BUTTON_SIZES, BUTTON_VARIANTS } from './buttonVariants.ts';

export function IconButtonDemo() {
  return (
    <Section title="IconButton" description="every variant × size, from atoms/IconButton">
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
              <IconButton
                key={size}
                variant={variant}
                size={size}
                icon={Star}
                aria-label={`${variant} ${size} star`}
              />
            ))}
            <IconButton
              variant={variant}
              icon={ChevronLeft}
              aria-label={`${variant} chevron left`}
            />
          </Stack>
        ))}
      </Stack>
    </Section>
  );
}
