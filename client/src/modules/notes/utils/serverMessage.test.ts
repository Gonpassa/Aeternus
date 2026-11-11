import { describe, expect, it } from 'vitest';
import { AxiosError } from 'axios';
import { serverMessage } from './serverMessage.ts';

const refused = (body: unknown) =>
  new AxiosError('Conflict', undefined, undefined, undefined, {
    status: 409,
    statusText: 'Conflict',
    data: body,
    headers: {},
    config: { headers: {} as never },
  });

describe('serverMessage', () => {
  // The refusal names the Permanent note it protects, and that naming is the point of it
  // (ADR 0014), so it reaches the user as the server wrote it.
  it('passes the server’s own words through', () => {
    const message = 'Removing this Link would leave “A claim” with nothing linked to it.';
    expect(serverMessage(refused({ error: message }), 'Fallback.')).toBe(message);
  });

  it('falls back when the failure carries nothing to read', () => {
    expect(serverMessage(refused({}), 'Fallback.')).toBe('Fallback.');
    expect(serverMessage(refused({ error: '' }), 'Fallback.')).toBe('Fallback.');
    expect(serverMessage(new Error('Network Error'), 'Fallback.')).toBe('Fallback.');
  });
});
