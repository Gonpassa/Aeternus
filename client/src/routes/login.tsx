import { createFileRoute, getRouteApi, useNavigate, Link } from '@tanstack/react-router';
import { FormEvent, useState } from 'react';
import { Box, chakra, Heading, Input, Text } from '@chakra-ui/react';
import { useAuth } from '../shell/AuthProvider.tsx';
import { Button } from '../components/ui/button.tsx';

export interface LoginSearch {
  redirect?: string;
}

const routeApi = getRouteApi('/login');

function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const search = routeApi.useSearch();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    try {
      await login({ username, password });
      navigate({ to: search.redirect ?? '/' });
    } catch {
      setError('Invalid username or password.');
    }
  };

  return (
    <Box mx="auto" maxW="sm" p="4">
      <Heading as="h1" mb="4" fontSize="xl" fontWeight="semibold">
        Log in
      </Heading>
      <chakra.form onSubmit={handleSubmit} display="flex" flexDirection="column" gap="3">
        <chakra.label display="flex" flexDirection="column" gap="1" htmlFor="login-username">
          Username
          <Input
            id="login-username"
            borderColor="gray.300"
            p="2"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
          />
        </chakra.label>
        <chakra.label display="flex" flexDirection="column" gap="1" htmlFor="login-password">
          Password
          <Input
            id="login-password"
            type="password"
            borderColor="gray.300"
            p="2"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </chakra.label>
        {error && <Text color="red.600">{error}</Text>}
        <Button type="submit" bg="black" p="2" color="white">
          Log in
        </Button>
      </chakra.form>
      <Text mt="3" fontSize="sm" color="inkSoft">
        Don&apos;t have an account? <Link to="/register">Register</Link>
      </Text>
    </Box>
  );
}

export const Route = createFileRoute('/login')({
  component: LoginPage,
  validateSearch: (search: Record<string, unknown>): LoginSearch => ({
    redirect: typeof search.redirect === 'string' ? search.redirect : undefined,
  }),
});
