import { AxiosError } from 'axios';
import type { ApiErrorResponse } from '@nee3/shared-types';

export const LINK_REMOVAL_FAILED = 'That connection could not be removed just now.';

// The server's own words for a refused removal. A removal that would leave a Permanent note
// with no Links at all is refused outright, and the refusal names the notes it is protecting
// (ADR 0014) - so the message has to reach the user verbatim rather than as a generic failure.
//
// It is read here rather than in the global interceptor in api/client.ts, which deliberately
// leaves expected 4xx answers to the caller: this one belongs beside the button that asked for
// the removal.
export const linkRemovalRefusal = (error: unknown): string => {
  if (error instanceof AxiosError) {
    const data = error.response?.data as ApiErrorResponse | undefined;
    if (typeof data?.error === 'string' && data.error !== '') {
      return data.error;
    }
  }
  return LINK_REMOVAL_FAILED;
};
