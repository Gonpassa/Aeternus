/* eslint-disable react/jsx-props-no-spreading --
   Variant styling is forwarded via `{...variantStyles[variant]}` to the underlying Chakra
   primitives, mirroring the thin-wrapper pattern of the other atoms. */
import * as React from 'react';
import { Box, type BoxProps } from '@chakra-ui/react';

export type SelectionToolbarAction = {
  label: string;
  onSelect: () => void;
};

export type SelectionToolbarVariant = 'ink' | 'paper';

export interface SelectionToolbarProps {
  /** Viewport rect of the current selection; null renders nothing. */
  rect: DOMRect | null;
  actions: SelectionToolbarAction[];
  /** Visual treatment; 'ink' is the validated default. */
  variant?: SelectionToolbarVariant;
  /** Names the toolbar for assistive technology. */
  'aria-label': string;
}

// Gap between the selection rect and the toolbar, and minimum distance kept from either
// horizontal viewport edge.
const SELECTION_GAP = 8;
const VIEWPORT_MARGIN = 8;

const variantStyles: Record<SelectionToolbarVariant, { container: BoxProps; action: BoxProps }> = {
  // A solid ink bar with paper text; hovering fills the hovered action with moss. No
  // elevation change on hover, per the design system.
  ink: {
    container: { bg: 'inkBlue' },
    action: { color: 'paper', _hover: { bg: 'moss' } },
  },
  // The paper-card look of the module-scoped toolbar this atom replaced, kept expressible
  // for contexts where a dark bar would fight its surroundings. No current caller uses it.
  paper: {
    container: { bg: 'paperCard', borderWidth: '1px', borderColor: 'line' },
    action: { color: 'inkBlue', _hover: { bg: 'line/40' } },
  },
};

// A floating toolbar anchored to a text-selection rect rather than a DOM trigger element -
// the reason atoms/Popover does not fit here. Fully controlled and presentational: the
// caller decides when a selection warrants a toolbar (and owns Escape/outside-click
// dismissal), this atom only positions itself over the given rect - centered above it,
// clamped inside the horizontal viewport edges, flipped below when there is no room above.
export function SelectionToolbar({
  rect,
  actions,
  variant = 'ink',
  'aria-label': ariaLabel,
}: SelectionToolbarProps) {
  const containerRef = React.useRef<HTMLDivElement>(null);
  const [placement, setPlacement] = React.useState<{ top: number; left: number } | null>(null);
  // Roving tabindex per the WAI-ARIA toolbar pattern: one tab stop, arrows move focus.
  const [focusedIndex, setFocusedIndex] = React.useState(0);

  React.useLayoutEffect(() => {
    setFocusedIndex(0);
    if (!rect) {
      setPlacement(null);
      return;
    }
    const container = containerRef.current;
    if (!container) return;
    const { width, height } = container.getBoundingClientRect();
    const centered = rect.left + rect.width / 2 - width / 2;
    const left = Math.min(
      Math.max(centered, VIEWPORT_MARGIN),
      Math.max(window.innerWidth - width - VIEWPORT_MARGIN, VIEWPORT_MARGIN),
    );
    const fitsAbove = rect.top - height - SELECTION_GAP >= 0;
    const top = fitsAbove ? rect.top - height - SELECTION_GAP : rect.bottom + SELECTION_GAP;
    setPlacement({ top, left });
  }, [rect]);

  if (!rect) return null;

  const moveFocus = (delta: number) => {
    if (actions.length === 0) return;
    const next = (focusedIndex + delta + actions.length) % actions.length;
    setFocusedIndex(next);
    const buttons = containerRef.current?.querySelectorAll('button');
    buttons?.[next]?.focus();
  };

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'ArrowRight') {
      event.preventDefault();
      moveFocus(1);
    }
    if (event.key === 'ArrowLeft') {
      event.preventDefault();
      moveFocus(-1);
    }
  };

  return (
    <Box
      ref={containerRef}
      role="toolbar"
      aria-label={ariaLabel}
      position="fixed"
      top={`${placement?.top ?? 0}px`}
      left={`${placement?.left ?? 0}px`}
      visibility={placement ? 'visible' : 'hidden'}
      zIndex="popover"
      display="flex"
      borderRadius="md"
      overflow="hidden"
      boxShadow="md"
      // Pressing an action must not collapse the text selection before the action runs -
      // callers read the selection when onSelect fires - so keep the press from stealing
      // focus/selection.
      onMouseDown={(event) => event.preventDefault()}
      onKeyDown={handleKeyDown}
      {...variantStyles[variant].container}
    >
      {actions.map((action, index) => (
        <Box
          key={action.label}
          as="button"
          type="button"
          tabIndex={index === focusedIndex ? 0 : -1}
          onClick={action.onSelect}
          cursor="pointer"
          px="3"
          py="2"
          textStyle="button"
          whiteSpace="nowrap"
          transition="background-color 150ms ease-out"
          {...variantStyles[variant].action}
        >
          {action.label}
        </Box>
      ))}
    </Box>
  );
}
