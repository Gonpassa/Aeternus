import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { FormEvent, FormEventHandler, useState } from 'react';
import { useAuth } from '../shell/AuthProvider.tsx';
import { Button } from '../components/ui/Button/Button.tsx';
import { PageContainer } from '../components/ui/PageContainer/PageContainer.tsx';
import { Heading } from '../components/ui/Heading/Heading.tsx';
import { Stack } from '../components/ui/Stack/Stack.tsx';
import { FieldLabel } from '../components/ui/FieldLabel/FieldLabel.tsx';
import { Input } from '../components/ui/Input/Input.tsx';
import { Text } from '../components/ui/Text/Text.tsx';

function RegisterPage() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    try {
      await register({ username, email, password });
      navigate({ to: '/' });
    } catch {
      setError('Could not create account. Username or email may already be taken.');
    }
  };

  return (
    <PageContainer maxW="sm" centered>
      <Heading as="h1" mb="4" fontSize="xl" fontWeight="semibold">
        Register
      </Heading>
      <Stack
        as="form"
        direction="column"
        gap="3"
        // Stack's props are typed against its div-rendering default; `as="form"` changes the
        // rendered element at runtime but not the typed handler signature, hence the cast.
        onSubmit={handleSubmit as unknown as FormEventHandler<HTMLDivElement>}
      >
        <FieldLabel htmlFor="register-username">
          Username
          <Input
            id="register-username"
            borderColor="gray.300"
            p="2"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
          />
        </FieldLabel>
        <FieldLabel htmlFor="register-email">
          Email
          <Input
            id="register-email"
            type="email"
            borderColor="gray.300"
            p="2"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </FieldLabel>
        <FieldLabel htmlFor="register-password">
          Password
          <Input
            id="register-password"
            type="password"
            borderColor="gray.300"
            p="2"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </FieldLabel>
        <FieldLabel htmlFor="register-confirm-password">
          Confirm password
          <Input
            id="register-confirm-password"
            type="password"
            borderColor="gray.300"
            p="2"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
          />
        </FieldLabel>
        {error && <Text variant="formError">{error}</Text>}
        <Button type="submit" bg="black" p="2" color="white">
          Register
        </Button>
      </Stack>
    </PageContainer>
  );
}

export const Route = createFileRoute('/register')({
  component: RegisterPage,
});
