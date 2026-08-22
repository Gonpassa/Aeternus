// PROTOTYPE-ONLY — illustrates how additional widgets will occupy the grid once more
// modules exist. Not a real "coming soon" card; never intended for production (see
// issue #21's "no placeholder cards" rule). Deleted along with the rest of this prototype.
import { Stack, type StackProps } from '../../atoms/Stack/Stack.tsx';
import { Text } from '../../atoms/Text/Text.tsx';

export function GhostWidget({
  label,
  gridColumn,
}: {
  label: string;
  gridColumn?: StackProps['gridColumn'];
}) {
  return (
    <Stack
      align="center"
      justify="center"
      minH="10rem"
      borderWidth="1px"
      borderStyle="dashed"
      borderColor="line"
      borderRadius="4px"
      gridColumn={gridColumn}
    >
      <Text variant="eyebrow" color="inkSoft/60">
        {label} (prototype ghost)
      </Text>
    </Stack>
  );
}
