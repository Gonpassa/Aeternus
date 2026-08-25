import { Link, useMatchRoute, useNavigate } from '@tanstack/react-router';
import { useAuth } from './AuthProvider.tsx';
import { Stack } from '../atoms/Stack/Stack.tsx';
import { Text } from '../atoms/Text/Text.tsx';

function RailLink({ to, children }: { to: string; children: string }) {
  const matchRoute = useMatchRoute();
  const isActive = Boolean(matchRoute({ to, fuzzy: true }));

  return (
    <Stack
      asChild
      alignItems="center"
      textStyle="button"
      color={isActive ? 'paper' : 'paper/72'}
      bg={isActive ? 'paper/12' : 'transparent'}
      boxShadow={isActive ? 'inset 2px 0 0 #A8532F' : 'none'}
      px="2.5"
      py="2.5"
      borderRadius="4px"
      _hover={{ color: 'paper', bg: 'paper/8' }}
    >
      <Link to={to}>{children}</Link>
    </Stack>
  );
}

export function Nav() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await logout();
    } finally {
      navigate({ to: '/' });
    }
  };

  return (
    <Stack
      as="nav"
      aria-label="Aeternus sections"
      direction="column"
      gap="10"
      w={{ base: '100%', md: '15rem' }}
      flexShrink="0"
      h={{ base: 'auto', md: '100vh' }}
      overflowY={{ base: 'visible', md: 'auto' }}
      bg="inkBlue"
      color="paper"
      px={{ base: '5', md: '6' }}
      py={{ base: '4', md: '7' }}
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

      {user && (
        <Stack direction="column" gap="1">
          <RailLink to="/journal">Journal</RailLink>
        </Stack>
      )}

      {import.meta.env.DEV && (
        <Stack direction="column" gap="1">
          <RailLink to="/dev/components">UI components</RailLink>
        </Stack>
      )}

      <Stack direction="column" mt="auto" textStyle="label" color="paper/45" lineHeight="tall">
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
            <Link to="/login">Log in</Link>
            <Link to="/register">Register</Link>
          </Stack>
        )}
      </Stack>
    </Stack>
  );
}
