import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { FormEvent, useState } from 'react';
import { Box, chakra, Heading, Input, Text } from '@chakra-ui/react';
import { useAuth } from '../shell/AuthProvider.tsx';
import { Button } from '../components/ui/Button/Button.tsx';

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
    <Box mx="auto" maxW="sm" p="4">
      <Heading as="h1" mb="4" fontSize="xl" fontWeight="semibold">
        Register
      </Heading>
      <chakra.form onSubmit={handleSubmit} display="flex" flexDirection="column" gap="3">
        <chakra.label display="flex" flexDirection="column" gap="1" htmlFor="register-username">
          Username
          <Input
            id="register-username"
            borderColor="gray.300"
            p="2"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
          />
        </chakra.label>
        <chakra.label display="flex" flexDirection="column" gap="1" htmlFor="register-email">
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
        </chakra.label>
        <chakra.label display="flex" flexDirection="column" gap="1" htmlFor="register-password">
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
        </chakra.label>
        <chakra.label
          display="flex"
          flexDirection="column"
          gap="1"
          htmlFor="register-confirm-password"
        >
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
        </chakra.label>
        {error && <Text color="red.600">{error}</Text>}
        <Button type="submit" bg="black" p="2" color="white">
          Register
        </Button>
      </chakra.form>
    </Box>
  );
}

export const Route = createFileRoute('/register')({
  component: RegisterPage,
});
