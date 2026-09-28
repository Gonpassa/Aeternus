import { useAuth } from '../AuthProvider.tsx';
import { Stack } from '../../atoms/Stack/Stack.tsx';
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
        </Stack>
      )}

      {import.meta.env.DEV && (
        <Stack direction="column" gap="1">
          <RailLink to="/dev/components" onClick={onLinkClick}>
            UI components
          </RailLink>
          {/* PROTOTYPE (issue #73) - remove with modules/notes-capture-prototype/. */}
          <RailLink to="/prototype/notes-capture" onClick={onLinkClick}>
            Capture prototype
          </RailLink>
        </Stack>
      )}
    </>
  );
}
