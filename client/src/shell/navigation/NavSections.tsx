import { useAuth } from '../AuthProvider.tsx';
import { Stack } from '../../atoms/Stack/Stack.tsx';
import { Text } from '../../atoms/Text/Text.tsx';
import { RailLink } from './RailLink.tsx';

export function NavSections({ onLinkClick }: { onLinkClick?: () => void }) {
  const { user } = useAuth();

  return (
    <>
      {user && (
        <Stack direction="column" gap="1">
          <RailLink to="/journal" onClick={onLinkClick}>
            Journal
          </RailLink>
          <RailLink to="/dreams" onClick={onLinkClick}>
            Dream Journal
          </RailLink>
          {/* Notes is a heading rather than a link: the module has no landing page of its
              own, and both of its pages - Read here, Review with its own ticket - are
              destinations in their own right. */}
          <Text textStyle="label" color="paper/50" px="2.5" pt="3" pb="1">
            Notes
          </Text>
          <RailLink to="/notes/read" nested onClick={onLinkClick}>
            Read
          </RailLink>
        </Stack>
      )}

      {import.meta.env.DEV && (
        <Stack direction="column" gap="1">
          <RailLink to="/dev/components" onClick={onLinkClick}>
            UI components
          </RailLink>
        </Stack>
      )}
    </>
  );
}
