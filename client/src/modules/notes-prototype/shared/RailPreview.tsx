// PROTOTYPE - a mock of the nav rail's Notes section, rendered inside the page because the
// real rail cannot show per-variant labels. The labels here ARE the proposal under test:
// issue #67 says the page names become nav labels and glossary terms.
import { Stack } from '../../../atoms/Stack/Stack.tsx';
import { Text } from '../../../atoms/Text/Text.tsx';
import { Button } from '../../../atoms/Button/Button.tsx';

export interface RailEntry {
  key: string;
  label: string;
  // A child entry under the module's own label, shown indented.
  nested?: boolean;
}

export function RailPreview({
  entries,
  active,
  onSelect,
}: {
  entries: RailEntry[];
  active: string;
  onSelect: (key: string) => void;
}) {
  return (
    <Stack
      direction="column"
      gap="1"
      bg="inkBlue"
      color="paper"
      px="4"
      py="3"
      borderRadius="md"
      minW="12rem"
      alignSelf="flex-start"
    >
      <Text textStyle="label" color="paper/50" mb="1">
        Rail preview
      </Text>
      {entries.map((entry) => {
        const isActive = entry.key === active;
        return (
          <Button
            key={entry.key}
            variant="ghost"
            size="sm"
            justifyContent="flex-start"
            color={isActive ? 'paper' : 'paper/72'}
            bg={isActive ? 'paper/12' : 'transparent'}
            boxShadow={isActive ? 'inset 2px 0 0 #A8532F' : 'none'}
            pl={entry.nested ? '6' : '2.5'}
            _hover={{ color: 'paper', bg: 'paper/8', textDecoration: 'none' }}
            onClick={() => onSelect(entry.key)}
          >
            {entry.label}
          </Button>
        );
      })}
    </Stack>
  );
}
