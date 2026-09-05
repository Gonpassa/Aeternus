import { Spinner, type SpinnerSize } from '../../atoms/Spinner/Spinner.tsx';
import { Stack } from '../../atoms/Stack/Stack.tsx';
import { Section } from './Section.tsx';

const SIZES: SpinnerSize[] = ['xs', 'sm', 'default', 'lg'];
const COLORS = ['accent', 'primary', 'rust'];

export function SpinnerDemo() {
  return (
    <Section title="Spinner" description="indeterminate loading indicator, from atoms/Spinner">
      <Stack direction="row" gap="6" align="center">
        {SIZES.map((size) => (
          <Spinner key={size} size={size} />
        ))}
      </Stack>
      <Stack direction="row" gap="6" align="center" mt="4">
        {COLORS.map((color) => (
          <Spinner key={color} color={color} />
        ))}
      </Stack>
    </Section>
  );
}
