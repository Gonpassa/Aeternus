import { Link, useMatchRoute, useNavigate } from '@tanstack/react-router';
import { useAuth } from './AuthProvider.tsx';
import { Button } from '../components/ui/Button/Button.tsx';
import { Stack } from '../components/ui/Stack/Stack.tsx';
import { Text } from '../components/ui/Text/Text.tsx';

function RailLink({ to, children }: { to: string; children: string }) {
  const matchRoute = useMatchRoute();
  const isActive = Boolean(matchRoute({ to, fuzzy: true }));

  return (
    <Stack
      asChild
      alignItems="center"
      fontFamily="mono"
      fontSize="13px"
      letterSpacing="wide"
      textTransform="uppercase"
      color={isActive ? 'paper' : 'paper/72'}
      bg={isActive ? 'paper/12' : 'transparent'}
      boxShadow={isActive ? 'inset 2px 0 0 #A8532F' : 'none'}
      px="2.5"
      py="2.5"
      borderRadius="4px"
      _hover={{ color: 'paper', bg: 'paper/8' }}
    >
      <Link to={to} search={to === '/journal' ? { page: 1 } : undefined}>
        {children}
      </Link>
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
      aria-label="Aeternus.3 sections"
      direction="column"
      gap="10"
      w={{ base: '100%', md: '15rem' }}
      flexShrink="0"
      bg="inkBlue"
      color="paper"
      px={{ base: '5', md: '6' }}
      py={{ base: '4', md: '7' }}
    >
      <Stack asChild direction="column" fontFamily="heading" fontWeight="semibold" fontSize="22px">
        <Link to="/">
          Aeternus
          <Text
            as="small"
            display="block"
            variant="eyebrow"
            fontSize="11px"
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

      <Stack
        direction="column"
        mt="auto"
        fontFamily="mono"
        fontSize="11px"
        color="paper/45"
        lineHeight="tall"
      >
        {user ? (
          <Stack direction="column" align="flex-start" gap="2">
            <Text color="paper/70" textTransform="uppercase" letterSpacing="wide">
              {user.username}
            </Text>
            <Button
              type="button"
              variant="link"
              h="auto"
              p="0"
              minW="0"
              color="paper"
              fontSize="11px"
              textTransform="uppercase"
              letterSpacing="wide"
              textDecoration="none"
              _hover={{ textDecoration: 'underline' }}
              onClick={handleLogout}
            >
              Log out
            </Button>
          </Stack>
        ) : (
          <Stack gap="3">
            <Stack asChild color="paper" textTransform="uppercase" letterSpacing="wide">
              <Link to="/login">Log in</Link>
            </Stack>
            <Stack asChild color="paper" textTransform="uppercase" letterSpacing="wide">
              <Link to="/register">Register</Link>
            </Stack>
          </Stack>
        )}
      </Stack>
    </Stack>
  );
}
