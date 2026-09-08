import { Link, useNavigate } from '@tanstack/react-router';
import { useAuth } from '../AuthProvider.tsx';
import { Stack } from '../../atoms/Stack/Stack.tsx';
import { Text } from '../../atoms/Text/Text.tsx';

export function AccountBlock({ onLinkClick }: { onLinkClick?: () => void }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    onLinkClick?.();
    try {
      await logout();
    } catch {
      // Navigate home regardless; the session cookie may already be gone either way.
    } finally {
      navigate({ to: '/' });
    }
  };

  return (
    <Stack direction="column" textStyle="label" color="paper/45" lineHeight="tall">
      {user ? (
        <Stack direction="column" align="flex-start" gap="2">
          <Text color="paper/70" textTransform="uppercase" letterSpacing="wide">
            {user.username}
          </Text>
          <Link to="/" onClick={handleLogout}>
            Log out
          </Link>
        </Stack>
      ) : (
        <Stack direction="column" align="flex-start" gap="2">
          <Link to="/login" onClick={onLinkClick}>
            Log in
          </Link>
          <Link to="/register" onClick={onLinkClick}>
            Register
          </Link>
        </Stack>
      )}
    </Stack>
  );
}
