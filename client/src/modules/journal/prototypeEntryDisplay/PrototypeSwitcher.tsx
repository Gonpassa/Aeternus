// PROTOTYPE - throwaway UI-variant switcher for the journal index route.
// Answers "what should entry display look like?" - not meant to reach production.
import { useEffect } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { IconButton } from '../../../atoms/IconButton/IconButton.tsx';
import { Text } from '../../../atoms/Text/Text.tsx';
import { Stack } from '../../../atoms/Stack/Stack.tsx';

export interface PrototypeVariantOption {
  key: string;
  name: string;
}

export interface PrototypeSwitcherProps {
  variants: PrototypeVariantOption[];
  current: string;
  onChange: (key: string) => void;
}

const isTypingTarget = (target: EventTarget | null) => {
  if (!(target instanceof HTMLElement)) return false;
  return target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable;
};

export function PrototypeSwitcher({ variants, current, onChange }: PrototypeSwitcherProps) {
  const index = Math.max(
    0,
    variants.findIndex((v) => v.key === current),
  );
  const cycle = (delta: number) => {
    const next = variants[(index + delta + variants.length) % variants.length];
    if (next) onChange(next.key);
  };

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if (isTypingTarget(event.target)) return;
      if (event.key === 'ArrowLeft') cycle(-1);
      if (event.key === 'ArrowRight') cycle(1);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- cycle closes over fresh index/variants each render
  }, [index, variants]);

  const active = variants[index];

  return (
    <Stack
      position="fixed"
      bottom="6"
      left="50%"
      transform="translateX(-50%)"
      bg="ink"
      color="paper"
      borderRadius="full"
      boxShadow="lg"
      px="2"
      py="2"
      zIndex="1400"
    >
      <Stack align="center" gap="1">
        <IconButton
          icon={ChevronLeft}
          aria-label="Previous variant"
          onClick={() => cycle(-1)}
          size="sm"
          variant="ghost"
          color="paper"
          _hover={{ bg: 'whiteAlpha.200' }}
        />
        <Text textStyle="label" color="paper" px="2" minW="14rem" textAlign="center">
          {active?.key} - {active?.name}
        </Text>
        <IconButton
          icon={ChevronRight}
          aria-label="Next variant"
          onClick={() => cycle(1)}
          size="sm"
          variant="ghost"
          color="paper"
          _hover={{ bg: 'whiteAlpha.200' }}
        />
      </Stack>
    </Stack>
  );
}
