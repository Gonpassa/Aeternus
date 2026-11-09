import { Link } from '@tanstack/react-router';
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
              destinations in their own right. The Topic index hangs off the heading rather
              than taking a rail entry of its own: it is the module's vocabulary rather than
              a third thing to do in it (#88). */}
          <Stack direction="row" align="baseline" justify="space-between" px="2.5" pt="3" pb="1">
            <Text textStyle="label" color="paper/50">
              Notes
            </Text>
            <Text asChild textStyle="label" color="paper/50" _hover={{ color: 'paper' }}>
              <Link to="/notes/topics" onClick={onLinkClick}>
                Topics
              </Link>
            </Text>
          </Stack>
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
