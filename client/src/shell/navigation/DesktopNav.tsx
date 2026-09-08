import { Link } from '@tanstack/react-router';
import { Stack } from '../../atoms/Stack/Stack.tsx';
import { Text } from '../../atoms/Text/Text.tsx';
import { NavSections } from './NavSections.tsx';
import { AccountBlock } from './AccountBlock.tsx';

export function DesktopNav() {
  return (
    <Stack
      as="nav"
      aria-label="Aeternus sections"
      direction="column"
      gap="10"
      w="15rem"
      flexShrink="0"
      h="100vh"
      overflowY="auto"
      bg="inkBlue"
      color="paper"
      px="6"
      py="7"
    >
      <Stack asChild direction="column" textStyle="sectionHeading">
        <Link to="/">
          Aeternus
          <Text
            as="small"
            display="block"
            variant="eyebrow"
            fontWeight="normal"
            color="paper/60"
            mt="1.5"
          >
            Journal &amp; commonplace book
          </Text>
        </Link>
      </Stack>

      <NavSections />

      <Stack direction="column" mt="auto">
        <AccountBlock />
      </Stack>
    </Stack>
  );
}
