import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AxiosError } from 'axios';
import type { AuthResponse, AuthUser, LoginRequest, RegisterRequest } from '@nee3/shared-types';
import { apiClient } from '../api/client.ts';
import { endpoints } from '../api/endpoints.ts';

export const authQueryKey = ['auth', 'me'] as const;

export const authQueryOptions = {
  queryKey: authQueryKey,
  queryFn: async (): Promise<AuthUser | null> => {
    try {
      const { data } = await apiClient.get<AuthResponse>(endpoints.auth.me);
      return data.user;
    } catch (err) {
      if (err instanceof AxiosError && err.response?.status === 401) {
        return null;
      }
      throw err;
    }
  },
  retry: false,
} as const;

export const useCurrentUser = () => useQuery<AuthUser | null>(authQueryOptions);

export const useLogin = () => {
  const queryClient = useQueryClient();
  return useMutation<AuthUser, Error, LoginRequest>({
    mutationFn: async (credentials) => {
      const { data } = await apiClient.post<AuthResponse>(endpoints.auth.login, credentials);
      return data.user;
    },
    onSuccess: (user) => {
      queryClient.setQueryData(authQueryKey, user);
    },
  });
};

export const useRegister = () => {
  const queryClient = useQueryClient();
  return useMutation<AuthUser, Error, RegisterRequest>({
    mutationFn: async (input) => {
      const { data } = await apiClient.post<AuthResponse>(endpoints.auth.register, input);
      return data.user;
    },
    onSuccess: (user) => {
      queryClient.setQueryData(authQueryKey, user);
    },
  });
};

export const useLogout = () => {
  const queryClient = useQueryClient();
  return useMutation<void, Error, void>({
    mutationFn: async () => {
      await apiClient.post(endpoints.auth.logout);
    },
    onSuccess: () => {
      queryClient.setQueryData(authQueryKey, null);
    },
    onError: () => {
      // The server may already consider the session gone (e.g. a 401 from
      // an expired session). Either way, the client should stop treating
      // the user as logged in.
      queryClient.setQueryData(authQueryKey, null);
    },
  });
};
