import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import type { ComponentType, ReactNode } from 'react';
import { AxiosError } from 'axios';

const mockNavigate = vi.fn();
const mockLogin = vi.fn();

vi.mock('@tanstack/react-router', () => ({
  createFileRoute: () => (routeConfig: unknown) => routeConfig,
  getRouteApi: () => ({ useSearch: () => ({ redirect: undefined }) }),
  useNavigate: () => mockNavigate,
  Link: ({ children, to }: { children: ReactNode; to: string }) => <a href={to}>{children}</a>,
}));

vi.mock('../shell/AuthProvider.tsx', () => ({
  useAuth: () => ({ login: mockLogin }),
}));

const { Route } = await import('./login.tsx');
const LoginPage = (Route as unknown as { component: ComponentType }).component;

describe('LoginPage', () => {
  beforeEach(() => {
    mockNavigate.mockReset();
    mockLogin.mockReset();
  });

  it('shows an inline error on blur when username is left blank', async () => {
    render(<LoginPage />);

    fireEvent.blur(screen.getByLabelText('Username'));

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent('Username is required');
    });
  });

  it('navigates on successful login', async () => {
    mockLogin.mockResolvedValue({ id: 1, username: 'gonzalo' });
    render(<LoginPage />);

    fireEvent.change(screen.getByLabelText('Username'), { target: { value: 'gonzalo' } });
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'hunter2' } });
    fireEvent.click(screen.getByRole('button', { name: /log in/i }));

    await waitFor(() => {
      expect(mockLogin).toHaveBeenCalledWith({ username: 'gonzalo', password: 'hunter2' });
    });
    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith({ to: '/' });
    });
  });

  it('shows invalid-credentials failure inline next to the password field, not as top-of-form text', async () => {
    mockLogin.mockRejectedValue(
      new AxiosError('Unauthorized', undefined, undefined, undefined, {
        status: 401,
        statusText: 'Unauthorized',
        data: { error: 'Invalid username or password' },
        headers: {},
        // @ts-expect-error -- minimal fake AxiosResponse for the test, config is unused here
        config: {},
      }),
    );
    render(<LoginPage />);

    fireEvent.change(screen.getByLabelText('Username'), { target: { value: 'gonzalo' } });
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'wrong' } });
    fireEvent.click(screen.getByRole('button', { name: /log in/i }));

    const error = await screen.findByRole('alert');
    expect(error).toHaveTextContent('Invalid username or password.');
    expect(error).toHaveAttribute('id', 'password-error');
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it('does not render an inline error for a network failure - the global toast handles it', async () => {
    mockLogin.mockRejectedValue(new AxiosError('Network Error'));
    render(<LoginPage />);

    fireEvent.change(screen.getByLabelText('Username'), { target: { value: 'gonzalo' } });
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'hunter2' } });
    fireEvent.click(screen.getByRole('button', { name: /log in/i }));

    await waitFor(() => {
      expect(mockLogin).toHaveBeenCalled();
    });
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });
});
