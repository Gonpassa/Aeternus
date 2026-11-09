import { AxiosError } from 'axios';
import type { ApiErrorResponse } from '@nee3/shared-types';

// What the server said, when it said something worth showing. The global interceptor in
// api/client.ts deliberately leaves expected 4xx answers to the caller, and several of this
// module's refusals are written to be read: a removal that would orphan a Permanent note names
// the note it is protecting (ADR 0014), and a connection refused at one end says which end
// (ADR 0015). Those have to reach the user in the server's own words, beside whatever asked
// for them.
//
// Anything else - a network failure, a 5xx the interceptor has already toasted - falls back to
// the caller's own line, because there is nothing specific to say.
export const serverMessage = (error: unknown, fallback: string): string => {
  if (error instanceof AxiosError) {
    const data = error.response?.data as ApiErrorResponse | undefined;
    if (typeof data?.error === 'string' && data.error !== '') {
      return data.error;
    }
  }
  return fallback;
};
