import { Button } from '../../../../atoms/Button/Button.tsx';
import { Card } from '../../../../atoms/Card/Card.tsx';

export interface AnchorToolbarProps {
  rect: DOMRect | null;
  onAddEmotionalBeat: () => void;
}

// A small floating toolbar positioned over the current text selection, offering "add
// emotional beat" (and, in later tickets, other attachment types). Positioned with fixed,
// viewport-relative coordinates from the selection's own bounding rect, rather than
// atoms/Popover, since the anchor point here is a selection range, not a DOM trigger
// element - no position:relative wrapper needed around the editor as a result.
export function AnchorToolbar({ rect, onAddEmotionalBeat }: AnchorToolbarProps) {
  if (!rect) return null;

  return (
    <Card
      padding="sm"
      position="fixed"
      top={`${rect.top - 60}px`}
      left={`${rect.left}px`}
      zIndex="popover"
      boxShadow="md"
    >
      <Button type="button" size="sm" variant="outline" onClick={onAddEmotionalBeat}>
        Add emotional beat
      </Button>
    </Card>
  );
}
