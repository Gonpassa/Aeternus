import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { FormEvent, useState } from 'react';
import { useAuth } from '../shell/AuthProvider.tsx';

function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    try {
      await login({ username, password });
      navigate({ to: '/' });
    } catch {
      setError('Invalid username or password.');
    }
  };

  return (
    <div className="mx-auto max-w-sm p-4">
      <h1 className="mb-4 text-xl font-semibold">Log in</h1>
      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        <label className="flex flex-col gap-1" htmlFor="login-username">
          Username
          <input
            id="login-username"
            className="border border-gray-300 p-2"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
          />
        </label>
        <label className="flex flex-col gap-1" htmlFor="login-password">
          Password
          <input
            id="login-password"
            type="password"
            className="border border-gray-300 p-2"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </label>
        {error && <p className="text-red-600">{error}</p>}
        <button type="submit" className="bg-black p-2 text-white">
          Log in
        </button>
      </form>
    </div>
  );
}

export const Route = createFileRoute('/login')({
  component: LoginPage,
});
