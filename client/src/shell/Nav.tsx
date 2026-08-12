import { Link, useNavigate } from '@tanstack/react-router';
import { Box, Flex, Text } from '@chakra-ui/react';
import { useAuth } from './AuthProvider.tsx';
import { Button } from '../components/ui/button.tsx';

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
    <Flex as="nav" align="center" gap="4" borderBottomWidth="1px" borderColor="line" p="4">
      <Box asChild fontFamily="heading" fontWeight="medium" color="ink">
        <Link to="/">Nee.3</Link>
      </Box>
      <Flex
        ml="auto"
        align="center"
        gap="4"
        fontFamily="mono"
        fontSize="xs"
        textTransform="uppercase"
      >
        {user ? (
          <>
            <Box asChild color="inkBlue">
              <Link to="/journal" search={{ page: 1 }}>
                Journal
              </Link>
            </Box>
            <Text color="inkSoft">{user.username}</Text>
            <Button
              type="button"
              variant="link"
              h="auto"
              p="0"
              color="inkBlue"
              textDecoration="none"
              _hover={{ textDecoration: 'underline' }}
              onClick={handleLogout}
            >
              Log out
            </Button>
          </>
        ) : (
          <>
            <Box asChild color="inkBlue">
              <Link to="/login">Log in</Link>
            </Box>
            <Box asChild color="inkBlue">
              <Link to="/register">Register</Link>
            </Box>
          </>
        )}
      </Flex>
    </Flex>
  );
}
