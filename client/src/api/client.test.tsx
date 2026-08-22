import { afterEach, describe, expect, it } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { AxiosError } from 'axios';
import { apiClient } from './client.ts';
import { AppToaster, toaster } from '../atoms/Toaster/Toaster.tsx';

const failingAdapter = () => Promise.reject(new AxiosError('Network Error'));

afterEach(() => {
  toaster.remove();
});

describe('apiClient response interceptor', () => {
  it('renders a global toast for an unhandled request failure', async () => {
    render(<AppToaster />);

    await apiClient.get('/whatever', { adapter: failingAdapter }).catch(() => {});

    await waitFor(() => {
      expect(screen.getByText('Something went wrong')).toBeInTheDocument();
    });
  });

  it('still rejects the promise so callers can catch the error themselves', async () => {
    render(<AppToaster />);

    await expect(apiClient.get('/whatever', { adapter: failingAdapter })).rejects.toBeInstanceOf(
      AxiosError,
    );
  });

  it('does not toast for an expected 4xx failure', async () => {
    render(<AppToaster />);

    const notFoundAdapter = () =>
      Promise.reject(
        new AxiosError('Not Found', undefined, undefined, undefined, {
          status: 404,
          statusText: 'Not Found',
          data: { error: 'Not found' },
          headers: {},
          // @ts-expect-error -- minimal fake AxiosResponse for the test, config is unused here
          config: {},
        }),
      );

    await apiClient.get('/whatever', { adapter: notFoundAdapter }).catch(() => {});

    expect(screen.queryByText('Something went wrong')).not.toBeInTheDocument();
  });
});
