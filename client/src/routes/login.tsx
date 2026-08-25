import { createFileRoute, getRouteApi, useNavigate, Link } from '@tanstack/react-router';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { AxiosError } from 'axios';
import { useAuth } from '../shell/AuthProvider.tsx';
import { Button } from '../atoms/Button/Button.tsx';
import { PageContainer } from '../atoms/PageContainer/PageContainer.tsx';
import { Heading } from '../atoms/Heading/Heading.tsx';
import { Stack } from '../atoms/Stack/Stack.tsx';
import { FormField } from '../atoms/FormField/FormField.tsx';
import { Text } from '../atoms/Text/Text.tsx';

export interface LoginSearch {
  redirect?: string;
}

const routeApi = getRouteApi('/login');

const loginSchema = z.object({
  username: z.string().min(1, 'Username is required'),
  password: z.string().min(1, 'Password is required'),
});
type LoginFormValues = z.infer<typeof loginSchema>;

function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const search = routeApi.useSearch();
  const {
    control,
    handleSubmit,
    setError,
    formState: { isSubmitting },
  } = useForm<LoginFormValues>({
    defaultValues: { username: '', password: '' },
    resolver: zodResolver(loginSchema),
    mode: 'onBlur',
    reValidateMode: 'onChange',
  });

  const onValid = async (values: LoginFormValues) => {
    try {
      await login(values);
      navigate({ to: search.redirect ?? '/' });
    } catch (err) {
      if (err instanceof AxiosError && err.response?.status === 401) {
        setError('password', { message: 'Invalid username or password.' });
      }
      // Anything else (network errors, unexpected 5xxs) is already surfaced by the
      // global toast interceptor in api/client.ts - nothing more to do here.
    }
  };

  return (
    <PageContainer maxW="sm" centered>
      <Heading as="h1" mb="4" variant="page">
        Log in
      </Heading>
      <Stack as="form" direction="column" gap="3" onSubmit={handleSubmit(onValid)}>
        <FormField
          control={control}
          name="username"
          label="Username"
          borderColor="gray.300"
          p="2"
        />
        <FormField
          control={control}
          name="password"
          label="Password"
          type="password"
          borderColor="gray.300"
          p="2"
        />
        <Button type="submit" bg="black" p="2" color="white" loading={isSubmitting}>
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
