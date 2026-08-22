import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import type { ComponentType } from 'react';
import { AxiosError } from 'axios';

const mockNavigate = vi.fn();
const mockRegister = vi.fn();

vi.mock('@tanstack/react-router', () => ({
  createFileRoute: () => (routeConfig: unknown) => routeConfig,
  useNavigate: () => mockNavigate,
}));

vi.mock('../shell/AuthProvider.tsx', () => ({
  useAuth: () => ({ register: mockRegister }),
}));

const { Route } = await import('./register.tsx');
const RegisterPage = (Route as unknown as { component: ComponentType }).component;

const fillValidForm = () => {
  fireEvent.change(screen.getByLabelText('Username'), { target: { value: 'gonzalo' } });
  fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'gonzalo@example.com' } });
  fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'hunter22' } });
  fireEvent.change(screen.getByLabelText('Confirm password'), { target: { value: 'hunter22' } });
};

describe('RegisterPage', () => {
  beforeEach(() => {
    mockNavigate.mockReset();
    mockRegister.mockReset();
  });

  it('shows an inline error on blur when a required field is left blank', async () => {
    render(<RegisterPage />);

    fireEvent.blur(screen.getByLabelText('Email'));

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent('Email is required');
    });
  });

  it('catches a mismatched confirm-password client-side, next to confirmPassword', async () => {
    render(<RegisterPage />);

    fireEvent.change(screen.getByLabelText('Username'), { target: { value: 'gonzalo' } });
    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'gonzalo@example.com' } });
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'hunter22' } });
    fireEvent.change(screen.getByLabelText('Confirm password'), { target: { value: 'different' } });
    fireEvent.click(screen.getByRole('button', { name: /register/i }));

    const error = await screen.findByRole('alert');
    expect(error).toHaveTextContent('Passwords do not match.');
    expect(error).toHaveAttribute('id', 'confirmPassword-error');
    expect(mockRegister).not.toHaveBeenCalled();
  });

  it('registers and navigates on success, without sending confirmPassword', async () => {
    mockRegister.mockResolvedValue({ id: 1, username: 'gonzalo' });
    render(<RegisterPage />);

    fillValidForm();
    fireEvent.click(screen.getByRole('button', { name: /register/i }));

    await waitFor(() => {
      expect(mockRegister).toHaveBeenCalledWith({
        username: 'gonzalo',
        email: 'gonzalo@example.com',
        password: 'hunter22',
      });
    });
    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith({ to: '/' });
    });
  });

  it('shows a taken-username failure inline next to the username field, not as top-of-form text', async () => {
    mockRegister.mockRejectedValue(
      new AxiosError('Conflict', undefined, undefined, undefined, {
        status: 409,
        statusText: 'Conflict',
        data: { error: 'Username already taken' },
        headers: {},
        // @ts-expect-error -- minimal fake AxiosResponse for the test, config is unused here
        config: {},
      }),
    );
    render(<RegisterPage />);

    fillValidForm();
    fireEvent.click(screen.getByRole('button', { name: /register/i }));

    const error = await screen.findByRole('alert');
    expect(error).toHaveTextContent('Username or email is already taken.');
    expect(error).toHaveAttribute('id', 'username-error');
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it('does not render an inline error for a network failure - the global toast handles it', async () => {
    mockRegister.mockRejectedValue(new AxiosError('Network Error'));
    render(<RegisterPage />);

    fillValidForm();
    fireEvent.click(screen.getByRole('button', { name: /register/i }));

    await waitFor(() => {
      expect(mockRegister).toHaveBeenCalled();
    });
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });
});
