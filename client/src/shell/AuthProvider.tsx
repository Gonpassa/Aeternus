import { createContext, PropsWithChildren, ReactNode, useContext, useMemo } from 'react';
import type { AuthUser, LoginRequest, RegisterRequest } from '@nee3/shared-types';
import { useCurrentUser, useLogin, useLogout, useRegister } from '../auth/queries.ts';

interface AuthContextValue {
  user: AuthUser | null;
  isLoading: boolean;
  login: (credentials: LoginRequest) => Promise<AuthUser>;
  register: (input: RegisterRequest) => Promise<AuthUser>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: PropsWithChildren): ReactNode {
  const { data: user, isLoading } = useCurrentUser();
  const loginMutation = useLogin();
  const registerMutation = useRegister();
  const logoutMutation = useLogout();

  const value = useMemo<AuthContextValue>(
    () => ({
      user: user ?? null,
      isLoading,
      login: (credentials) => loginMutation.mutateAsync(credentials),
      register: (input) => registerMutation.mutateAsync(input),
      logout: () => logoutMutation.mutateAsync(),
    }),
    [user, isLoading, loginMutation, registerMutation, logoutMutation],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
