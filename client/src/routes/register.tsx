import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { FormEvent, useState } from 'react';
import { useAuth } from '../shell/AuthProvider.tsx';

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
    <div className="mx-auto max-w-sm p-4">
      <h1 className="mb-4 text-xl font-semibold">Register</h1>
      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        <label className="flex flex-col gap-1" htmlFor="register-username">
          Username
          <input
            id="register-username"
            className="border border-gray-300 p-2"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
          />
        </label>
        <label className="flex flex-col gap-1" htmlFor="register-email">
          Email
          <input
            id="register-email"
            type="email"
            className="border border-gray-300 p-2"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </label>
        <label className="flex flex-col gap-1" htmlFor="register-password">
          Password
          <input
            id="register-password"
            type="password"
            className="border border-gray-300 p-2"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </label>
        <label className="flex flex-col gap-1" htmlFor="register-confirm-password">
          Confirm password
          <input
            id="register-confirm-password"
            type="password"
            className="border border-gray-300 p-2"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
          />
        </label>
        {error && <p className="text-red-600">{error}</p>}
        <button type="submit" className="bg-black p-2 text-white">
          Register
        </button>
      </form>
    </div>
  );
}

export const Route = createFileRoute('/register')({
  component: RegisterPage,
});
