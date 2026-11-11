import { useAuth } from '../AuthProvider.tsx';
import { Stack } from '../../atoms/Stack/Stack.tsx';
import { Text } from '../../atoms/Text/Text.tsx';
import { RailLink } from './RailLink.tsx';
import { ReviewRailLink } from '../../modules/notes/components/ReviewRailLink/ReviewRailLink.tsx';

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
              own, and its pages - Topics, Read and Review - are destinations in their own
              right. Topics is an entry like the other two rather than a link beside the
              heading, where it read as a different kind of thing from the pages below it
              (#104). */}
          <Text textStyle="label" color="paper/50" px="2.5" pt="3" pb="1">
            Notes
          </Text>
          <RailLink to="/notes/topics" nested onClick={onLinkClick}>
            Topics
          </RailLink>
          <RailLink to="/notes/read" nested onClick={onLinkClick}>
            Read
          </RailLink>
          {/* Review carries the badge, so it asks the module for the link rather than the
              other way round. */}
          <ReviewRailLink onClick={onLinkClick} />
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
