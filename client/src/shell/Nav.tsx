import { Link, useMatchRoute, useNavigate } from '@tanstack/react-router';
import { Box, Flex, Text } from '@chakra-ui/react';
import { useAuth } from './AuthProvider.tsx';
import { Button } from '../components/ui/Button/Button.tsx';

function RailLink({ to, children }: { to: string; children: string }) {
  const matchRoute = useMatchRoute();
  const isActive = Boolean(matchRoute({ to, fuzzy: true }));

  return (
    <Box
      asChild
      display="flex"
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
    </Box>
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
    <Flex
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
      <Box asChild fontFamily="heading" fontWeight="semibold" fontSize="22px">
        <Link to="/">
          Aeternus
          <Box
            as="small"
            display="block"
            fontFamily="mono"
            fontSize="11px"
            fontWeight="normal"
            letterSpacing="wide"
            textTransform="uppercase"
            color="paper/60"
            mt="1.5"
          >
            Journal &amp; commonplace book
          </Box>
        </Link>
      </Box>

      {user && (
        <Flex direction="column" gap="1">
          <RailLink to="/journal">Journal</RailLink>
        </Flex>
      )}

      {import.meta.env.DEV && (
        <Flex direction="column" gap="1">
          <RailLink to="/dev/components">UI components</RailLink>
        </Flex>
      )}

      <Box mt="auto" fontFamily="mono" fontSize="11px" color="paper/45" lineHeight="tall">
        {user ? (
          <Flex direction="column" align="flex-start" gap="2">
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
          </Flex>
        ) : (
          <Flex gap="3">
            <Box asChild color="paper" textTransform="uppercase" letterSpacing="wide">
              <Link to="/login">Log in</Link>
            </Box>
            <Box asChild color="paper" textTransform="uppercase" letterSpacing="wide">
              <Link to="/register">Register</Link>
            </Box>
          </Flex>
        )}
      </Box>
    </Flex>
  );
}
