/* eslint-disable -- PROTOTYPE (throwaway, never merges to main): exempt from repo lint standards */
/**
 * PROTOTYPE — throwaway code, never ship.
 * Floating toolbar shown over a fresh text selection (variants A and B).
 */
import { Box } from '@chakra-ui/react';
import { Button } from '../../../atoms/Button/Button.tsx';

export interface SelectionToolbarProps {
  rect: DOMRect;
  onAddBeat: () => void;
  onTagSymbol: () => void;
  onAnalyticNote: () => void;
}

export function SelectionToolbar({
  rect,
  onAddBeat,
  onTagSymbol,
  onAnalyticNote,
}: SelectionToolbarProps) {
  return (
    <Box
      position="fixed"
      top={`${rect.top - 44}px`}
      left={`${Math.max(8, rect.left + rect.width / 2 - 150)}px`}
      zIndex="20"
      bg="inkBlue"
      borderRadius="md"
      boxShadow="md"
      display="flex"
      gap="0"
      overflow="hidden"
    >
      <Button
        variant="ghost"
        size="xs"
        color="paper"
        _hover={{ bg: 'moss', textDecoration: 'none' }}
        onClick={onAddBeat}
      >
        + Emotional beat
      </Button>
      <Button
        variant="ghost"
        size="xs"
        color="paper"
        _hover={{ bg: 'moss', textDecoration: 'none' }}
        onClick={onTagSymbol}
      >
        + Symbol
      </Button>
      <Button
        variant="ghost"
        size="xs"
        color="paper"
        _hover={{ bg: 'moss', textDecoration: 'none' }}
        onClick={onAnalyticNote}
      >
        + Analytic note
      </Button>
    </Box>
  );
}
