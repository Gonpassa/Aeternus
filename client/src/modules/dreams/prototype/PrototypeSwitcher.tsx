/* eslint-disable -- PROTOTYPE (throwaway, never merges to main): exempt from repo lint standards */
/**
 * PROTOTYPE — throwaway code, never ship.
 * Floating bottom-center variant switcher. Arrow keys also cycle (unless an
 * input/textarea/contenteditable is focused). Hidden in production builds.
 */
import { useEffect } from 'react';
import { Box } from '@chakra-ui/react';
import { Text } from '../../../atoms/Text/Text.tsx';

export interface PrototypeSwitcherProps {
  variants: Array<{ key: string; name: string }>;
  current: string;
  onChange: (key: string) => void;
}

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
    const handler = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)
      )
        return;
      if (e.key === 'ArrowLeft') cycle(-1);
      if (e.key === 'ArrowRight') cycle(1);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  });

  if (import.meta.env.PROD) return null;

  const label = variants[index];

  return (
    <Box
      position="fixed"
      bottom="4"
      left="50%"
      transform="translateX(-50%)"
      zIndex="30"
      bg="ink"
      color="paper"
      borderRadius="full"
      boxShadow="lg"
      display="flex"
      alignItems="center"
      gap="3"
      px="4"
      py="2"
    >
      <Box as="button" cursor="pointer" aria-label="Previous variant" onClick={() => cycle(-1)}>
        <Text as="span" textStyle="button" color="paper">
          ←
        </Text>
      </Box>
      <Text as="span" textStyle="label" color="paper" whiteSpace="nowrap">
        {label ? `${label.key} — ${label.name}` : current}
      </Text>
      <Box as="button" cursor="pointer" aria-label="Next variant" onClick={() => cycle(1)}>
        <Text as="span" textStyle="button" color="paper">
          →
        </Text>
      </Box>
    </Box>
  );
}
