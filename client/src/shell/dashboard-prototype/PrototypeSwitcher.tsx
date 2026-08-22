// PROTOTYPE — floating variant switcher, per the /prototype skill's UI branch.
// Hidden outside dev builds; deleted along with the rest of this prototype once
// issue #23 is resolved.
import { useEffect } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Stack } from '../../atoms/Stack/Stack.tsx';
import { Text } from '../../atoms/Text/Text.tsx';
import { IconButton } from '../../atoms/IconButton/IconButton.tsx';

export interface PrototypeVariant {
  key: string;
  name: string;
}

export function PrototypeSwitcher({
  variants,
  current,
}: {
  variants: PrototypeVariant[];
  current: string;
}) {
  const navigate = useNavigate();
  const index = Math.max(
    variants.findIndex((v) => v.key === current),
    0,
  );
  const active = variants[index] as PrototypeVariant;

  const go = (delta: number) => {
    const nextIndex = (index + delta + variants.length) % variants.length;
    const next = variants[nextIndex] as PrototypeVariant;
    navigate({ to: '/', search: { variant: next.key } });
  };

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const isTyping =
        target?.tagName === 'INPUT' || target?.tagName === 'TEXTAREA' || target?.isContentEditable;
      if (isTyping) return;
      if (event.key === 'ArrowLeft') go(-1);
      if (event.key === 'ArrowRight') go(1);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index]);

  if (import.meta.env.PROD) return null;

  return (
    <Stack
      position="fixed"
      bottom="6"
      left="50%"
      transform="translateX(-50%)"
      align="center"
      gap="3"
      px="4"
      py="2"
      borderRadius="999px"
      bg="ink"
      color="paper"
      boxShadow="0 4px 16px rgba(0,0,0,0.35)"
      zIndex="1000"
    >
      <IconButton
        icon={ChevronLeft}
        aria-label="Previous variant"
        size="sm"
        variant="ghost"
        color="paper"
        onClick={() => go(-1)}
      />
      <Text fontFamily="mono" fontSize="xs" textTransform="uppercase" letterSpacing="wide">
        {active.key} — {active.name}
      </Text>
      <IconButton
        icon={ChevronRight}
        aria-label="Next variant"
        size="sm"
        variant="ghost"
        color="paper"
        onClick={() => go(1)}
      />
    </Stack>
  );
}
