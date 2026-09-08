import { Button } from '../../../../atoms/Button/Button.tsx';
import { Stack } from '../../../../atoms/Stack/Stack.tsx';
import { Text } from '../../../../atoms/Text/Text.tsx';

export interface SymbolLabelProps {
  name: string;
  // The remove affordance only exists while the symbol's anchor is the active one - a
  // resting margin note stays a quiet specimen label with no controls.
  showRemove: boolean;
  onRemove: () => void;
}

// Specimen-label treatment: a Symbol is a taxonomy term, not an action - mono small-caps
// over a dotted ink-blue rule, no fill and no leading glyph so it cannot read as a button.
export function SymbolLabel({ name, showRemove, onRemove }: SymbolLabelProps) {
  return (
    <Stack direction="row" align="baseline" gap="2">
      <Text
        as="span"
        textStyle="label"
        color="inkBlue"
        letterSpacing="0.08em"
        borderBottomWidth="1px"
        borderBottomStyle="dotted"
        borderBottomColor="inkBlue"
        pb="0.5"
      >
        {name}
      </Text>
      {showRemove && (
        <Button
          type="button"
          size="xs"
          variant="ghost"
          color="rust"
          aria-label={`Remove symbol ${name}`}
          onClick={onRemove}
        >
          ×
        </Button>
      )}
    </Stack>
  );
}
