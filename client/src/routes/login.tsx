import { createFileRoute, getRouteApi, useNavigate, Link } from '@tanstack/react-router';
import { FormEvent, FormEventHandler, useState } from 'react';
import { useAuth } from '../shell/AuthProvider.tsx';
import { Button } from '../components/ui/Button/Button.tsx';
import { PageContainer } from '../components/ui/PageContainer/PageContainer.tsx';
import { Heading } from '../components/ui/Heading/Heading.tsx';
import { Stack } from '../components/ui/Stack/Stack.tsx';
import { FieldLabel } from '../components/ui/FieldLabel/FieldLabel.tsx';
import { Input } from '../components/ui/Input/Input.tsx';
import { Text } from '../components/ui/Text/Text.tsx';

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
    <PageContainer maxW="sm" centered>
      <Heading as="h1" mb="4" fontSize="xl" fontWeight="semibold">
        Log in
      </Heading>
      <Stack
        as="form"
        direction="column"
        gap="3"
        // Stack's props are typed against its div-rendering default; `as="form"` changes the
        // rendered element at runtime but not the typed handler signature, hence the cast.
        onSubmit={handleSubmit as unknown as FormEventHandler<HTMLDivElement>}
      >
        <FieldLabel htmlFor="login-username">
          Username
          <Input
            id="login-username"
            borderColor="gray.300"
            p="2"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
          />
        </FieldLabel>
        <FieldLabel htmlFor="login-password">
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
        </FieldLabel>
        {error && <Text variant="formError">{error}</Text>}
        <Button type="submit" bg="black" p="2" color="white">
          Log in
        </Button>
      </Stack>
      <Text mt="3" variant="muted" fontSize="sm">
        Don&apos;t have an account? <Link to="/register">Register</Link>
      </Text>
    </PageContainer>
  );
}

export const Route = createFileRoute('/login')({
  component: LoginPage,
  validateSearch: (search: Record<string, unknown>): LoginSearch => ({
    redirect: typeof search.redirect === 'string' ? search.redirect : undefined,
  }),
});
