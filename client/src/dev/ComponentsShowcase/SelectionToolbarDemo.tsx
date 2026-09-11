import { useEffect, useRef, useState } from 'react';
import {
  SelectionToolbar,
  type SelectionToolbarVariant,
} from '../../atoms/SelectionToolbar/SelectionToolbar.tsx';
import { Stack } from '../../atoms/Stack/Stack.tsx';
import { Text } from '../../atoms/Text/Text.tsx';
import {
  ToggleButtonGroup,
  ToggleButtonGroupItem,
} from '../../atoms/ToggleButtonGroup/ToggleButtonGroup.tsx';
import { Section } from './Section.tsx';

// The atom positions itself over a selection rect but never produces one - the caller
// decides which selections warrant a toolbar. This demo watches for selections inside the
// passage below, the way the Dream Analysis page watches its manuscript.
export function SelectionToolbarDemo() {
  const passageRef = useRef<HTMLParagraphElement>(null);
  const [rect, setRect] = useState<DOMRect | null>(null);
  const [variant, setVariant] = useState<SelectionToolbarVariant>('ink');
  const [lastAction, setLastAction] = useState<string | null>(null);

  useEffect(() => {
    const handleSelectionChange = () => {
      const passage = passageRef.current;
      const selection = window.getSelection();
      const range =
        selection && selection.rangeCount > 0 && !selection.isCollapsed
          ? selection.getRangeAt(0)
          : null;
      if (!passage || !range || !passage.contains(range.commonAncestorContainer)) {
        setRect(null);
        return;
      }
      setRect(range.getBoundingClientRect());
    };
    document.addEventListener('selectionchange', handleSelectionChange);
    return () => document.removeEventListener('selectionchange', handleSelectionChange);
  }, []);

  const select = (label: string) => {
    setLastAction(label);
    setRect(null);
    window.getSelection()?.collapseToEnd();
  };

  return (
    <Section
      title="SelectionToolbar"
      description="floating actions anchored to a text selection, from atoms/SelectionToolbar"
    >
      <Stack direction="column" gap="3" maxW="32rem" align="stretch">
        <ToggleButtonGroup
          aria-label="Toolbar variant"
          value={variant}
          onChange={(value) => setVariant(value as SelectionToolbarVariant)}
        >
          <ToggleButtonGroupItem value="ink">Ink</ToggleButtonGroupItem>
          <ToggleButtonGroupItem value="paper">Paper</ToggleButtonGroupItem>
        </ToggleButtonGroup>
        <Text
          ref={passageRef}
          textStyle="body"
          bg="paperCard"
          borderWidth="1px"
          borderColor="line"
          borderRadius="md"
          p="4"
        >
          Select any part of this sentence to raise the toolbar over it, then drag near the left or
          right edge of the window to watch it clamp itself inside the viewport.
        </Text>
        <SelectionToolbar
          rect={rect}
          variant={variant}
          aria-label="Act on the selected passage"
          actions={[
            { label: 'Highlight', onSelect: () => select('Highlight') },
            { label: 'Comment', onSelect: () => select('Comment') },
            { label: 'Copy', onSelect: () => select('Copy') },
          ]}
        />
        <Text fontFamily="mono" fontSize="xs" color="inkSoft">
          Last action: {lastAction ?? 'none yet'}
        </Text>
      </Stack>
    </Section>
  );
}
