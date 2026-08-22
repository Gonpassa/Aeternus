import axios, { AxiosError } from 'axios';
import { toaster } from '../atoms/Toaster/Toaster.tsx';

export const apiClient = axios.create({
  baseURL: '/api',
  withCredentials: true,
});

// Network errors (no response) and unexpected 5xxs aren't actionable at a specific
// field, so they're surfaced once, globally, here - the one chokepoint every request
// already passes through. Expected 4xx failures (invalid credentials, duplicate
// username, validation errors) are left to the caller, which routes them inline via
// `setError` next to the relevant field. The error is rethrown either way so callers
// can still `catch` it themselves.
apiClient.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    const status = error.response?.status;
    const isUnexpectedFailure = status === undefined || status >= 500;
    if (isUnexpectedFailure) {
      toaster.create({
        type: 'error',
        title: 'Something went wrong',
        description: error.message,
      });
    }
    return Promise.reject(error);
  },
);
