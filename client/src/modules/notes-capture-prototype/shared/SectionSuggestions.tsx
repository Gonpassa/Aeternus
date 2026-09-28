// PROTOTYPE - the section half of the Locator suggests itself from this Source's earlier notes
// (#68, the Symbol autocomplete pattern scoped to one Source). Only the suggestion list is
// shared: how each variant presents the field around it is the thing under test.
import { Stack } from '../../../atoms/Stack/Stack.tsx';
import { Text } from '../../../atoms/Text/Text.tsx';
import { Button } from '../../../atoms/Button/Button.tsx';

export function SectionSuggestions({
  sections,
  value,
  onPick,
  label = 'Earlier',
}: {
  sections: string[];
  value: string;
  onPick: (section: string) => void;
  label?: string;
}) {
  const rest = sections.filter((s) => s !== value.trim());
  if (rest.length === 0) return null;

  return (
    <Stack gap="2" align="center" wrap="wrap">
      <Text textStyle="label" color="inkSoft">
        {label}
      </Text>
      {rest.slice(0, 4).map((s) => (
        <Button
          key={s}
          variant="ghost"
          size="xs"
          h="auto"
          px="1.5"
          py="0.5"
          textStyle="label"
          color="inkBlue"
          borderWidth="1px"
          borderColor="line"
          borderRadius="sm"
          _hover={{ bg: 'paperCard', textDecoration: 'none' }}
          onClick={() => onPick(s)}
        >
          {s}
        </Button>
      ))}
    </Stack>
  );
}
