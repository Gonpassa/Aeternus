import { createFileRoute, useNavigate } from '@tanstack/react-router';
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

const registerSchema = z
  .object({
    username: z.string().min(1, 'Username is required'),
    email: z.string().min(1, 'Email is required').email('Enter a valid email'),
    password: z.string().min(1, 'Password is required'),
    confirmPassword: z.string().min(1, 'Please confirm your password'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match.',
    path: ['confirmPassword'],
  });
type RegisterFormValues = z.infer<typeof registerSchema>;

function RegisterPage() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const {
    control,
    handleSubmit,
    setError,
    formState: { isSubmitting },
  } = useForm<RegisterFormValues>({
    defaultValues: { username: '', email: '', password: '', confirmPassword: '' },
    resolver: zodResolver(registerSchema),
    mode: 'onBlur',
    reValidateMode: 'onChange',
  });

  const onValid = async ({ confirmPassword: _confirmPassword, ...input }: RegisterFormValues) => {
    try {
      await register(input);
      navigate({ to: '/' });
    } catch (err) {
      if (err instanceof AxiosError && err.response?.status === 409) {
        setError('username', { message: 'Username or email is already taken.' });
      }
      // Anything else (network errors, unexpected 5xxs) is already surfaced by the
      // global toast interceptor in api/client.ts - nothing more to do here.
    }
  };

  return (
    <PageContainer maxW="sm" centered>
      <Heading as="h1" mb="4" fontSize="xl" fontWeight="semibold">
        Register
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
          name="email"
          label="Email"
          type="email"
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
        <FormField
          control={control}
          name="confirmPassword"
          label="Confirm password"
          type="password"
          borderColor="gray.300"
          p="2"
        />
        <Button type="submit" bg="black" p="2" color="white" loading={isSubmitting}>
          Register
        </Button>
      </Stack>
    </PageContainer>
  );
}

export const Route = createFileRoute('/register')({
  component: RegisterPage,
});
